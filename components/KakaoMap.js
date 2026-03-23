"use client";

import { useEffect, useRef, useState } from "react";

const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadKakaoMapSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저 환경이 아닙니다."));
      return;
    }

    if (!KAKAO_MAP_KEY) {
      reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다."));
      return;
    }

    if (window.kakao?.maps?.services) {
      window.kakao.maps.load(() => resolve(window.kakao));
      return;
    }

    const existingScript = document.querySelector('script[data-kakao-map-sdk="true"]');

    const handleLoad = () => {
      if (!window.kakao?.maps) {
        reject(new Error("카카오맵 SDK는 로드됐지만 kakao.maps를 찾지 못했습니다."));
        return;
      }

      window.kakao.maps.load(() => {
        if (!window.kakao?.maps?.services) {
          reject(new Error("카카오맵 services 라이브러리를 찾지 못했습니다."));
          return;
        }
        resolve(window.kakao);
      });
    };

    const handleError = () => {
      reject(new Error("카카오맵 SDK 스크립트 로드에 실패했습니다."));
    };

    if (existingScript) {
      if (window.kakao?.maps) {
        handleLoad();
        return;
      }
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.defer = true;
    script.dataset.kakaoMapSdk = "true";
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    document.head.appendChild(script);
  });
}

export default function KakaoMap({
  listing,
  onClose,
  embedded = false,
  contentHeightClass = "h-[520px]",
}) {
  const mapRef = useRef(null);
  const roadviewRef = useRef(null);

  const mapInstanceRef = useRef(null);
  const roadviewInstanceRef = useRef(null);
  const roadviewClientRef = useRef(null);

  const propertyMarkerRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);
  const clickHandlerRef = useRef(null);

  const propertyPositionRef = useRef(null);
  const selectedRoadviewPositionRef = useRef(null);
  const panoIdRef = useRef(null);
  const selectingRoadviewRef = useRef(false);

  const [activeTab, setActiveTab] = useState("map");
  const [mapStatus, setMapStatus] = useState("loading");
  const [mapMessage, setMapMessage] = useState("지도를 불러오는 중입니다...");
  const [roadviewStatus, setRoadviewStatus] = useState("idle");
  const [roadviewMessage, setRoadviewMessage] = useState("지도에서 위치를 선택하거나 매물 위치 로드뷰를 눌러주세요.");
  const [isSelectingRoadview, setIsSelectingRoadview] = useState(false);

  useEffect(() => {
    selectingRoadviewRef.current = isSelectingRoadview;
  }, [isSelectingRoadview]);

  const openRoadviewAt = (position, options = {}) => {
    const { switchTab = true, selectionSource = "clicked" } = options;
    const kakao = window.kakao;
    const map = mapInstanceRef.current;
    const roadview = roadviewInstanceRef.current;
    const roadviewClient = roadviewClientRef.current;

    if (!kakao?.maps || !map || !roadview || !roadviewClient || !position) {
      setRoadviewStatus("error");
      setRoadviewMessage("로드뷰를 초기화하지 못했습니다.");
      return;
    }

    setRoadviewStatus("loading");
    setRoadviewMessage("로드뷰를 찾는 중입니다...");

    roadviewClient.getNearestPanoId(position, 80, (panoId) => {
      if (!panoId) {
        setRoadviewStatus("empty");
        setRoadviewMessage("선택한 위치 근처에는 로드뷰 데이터가 없습니다. 다른 위치를 클릭해보세요.");
        if (selectionSource === "clicked") {
          setMapMessage("선택한 위치 근처에는 로드뷰 데이터가 없습니다. 다른 위치를 클릭해보세요.");
        }
        return;
      }

      panoIdRef.current = panoId;
      selectedRoadviewPositionRef.current = position;

      if (!selectedMarkerRef.current) {
        selectedMarkerRef.current = new kakao.maps.Marker({
          map,
          position,
        });
      } else {
        selectedMarkerRef.current.setMap(map);
        selectedMarkerRef.current.setPosition(position);
      }

      roadview.setPanoId(panoId, position);

      setRoadviewStatus("ready");
      setRoadviewMessage("");
      setMapMessage("");

      if (switchTab) {
        setActiveTab("roadview");
      }

      setIsSelectingRoadview(false);
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function initMapAndRoadview() {
      try {
        setActiveTab("map");
        setMapStatus("loading");
        setMapMessage("지도를 불러오는 중입니다...");
        setRoadviewStatus("idle");
        setRoadviewMessage("지도에서 위치를 선택하거나 매물 위치 로드뷰를 눌러주세요.");
        setIsSelectingRoadview(false);

        const kakao = await loadKakaoMapSdk();
        if (cancelled || !mapRef.current || !roadviewRef.current) return;

        const defaultCenter = new kakao.maps.LatLng(37.5665, 126.9780);

        const map = new kakao.maps.Map(mapRef.current, {
          center: defaultCenter,
          level: 3,
        });

        const roadview = new kakao.maps.Roadview(roadviewRef.current);
        const roadviewClient = new kakao.maps.RoadviewClient();

        mapInstanceRef.current = map;
        roadviewInstanceRef.current = roadview;
        roadviewClientRef.current = roadviewClient;

        const clickHandler = (mouseEvent) => {
          if (!selectingRoadviewRef.current) return;
          const clickedPosition = mouseEvent.latLng;
          openRoadviewAt(clickedPosition, {
            switchTab: true,
            selectionSource: "clicked",
          });
        };

        kakao.maps.event.addListener(map, "click", clickHandler);
        clickHandlerRef.current = clickHandler;

        const keyword = `${listing.region_name} ${listing.apt_name}`.trim();
        const places = new kakao.maps.services.Places();

        places.keywordSearch(keyword, (data, searchStatus) => {
          if (cancelled) return;

          if (
            searchStatus !== kakao.maps.services.Status.OK ||
            !Array.isArray(data) ||
            data.length === 0
          ) {
            setMapStatus("error");
            setMapMessage("해당 매물 위치를 지도에서 찾지 못했습니다.");
            return;
          }

          const place = data[0];
          const lat = Number(place.y);
          const lng = Number(place.x);
          const position = new kakao.maps.LatLng(lat, lng);

          propertyPositionRef.current = position;
          map.setCenter(position);

          const propertyMarker = new kakao.maps.Marker({
            map,
            position,
          });
          propertyMarkerRef.current = propertyMarker;

          const safeAptName = escapeHtml(listing.apt_name);
          const safeRegionName = escapeHtml(listing.region_name);

          const infoWindow = new kakao.maps.InfoWindow({
            content: `
              <div style="padding:10px 12px; min-width:180px; line-height:1.5;">
                <div style="font-weight:700; color:#111827;">${safeAptName}</div>
                <div style="font-size:12px; color:#6B7280; margin-top:4px;">${safeRegionName}</div>
              </div>
            `,
          });

          infoWindow.open(map, propertyMarker);
          infoWindowRef.current = infoWindow;

          setMapStatus("ready");
          setMapMessage("");
        });
      } catch (error) {
        if (cancelled) return;
        setMapStatus("error");
        setMapMessage(error.message || "카카오 지도를 불러오지 못했습니다.");
        setRoadviewStatus("error");
        setRoadviewMessage(error.message || "카카오 로드뷰를 불러오지 못했습니다.");
      }
    }

    initMapAndRoadview();

    return () => {
      cancelled = true;

      const kakao = window.kakao;
      const map = mapInstanceRef.current;

      if (kakao?.maps && map && clickHandlerRef.current) {
        kakao.maps.event.removeListener(map, "click", clickHandlerRef.current);
      }

      mapInstanceRef.current = null;
      roadviewInstanceRef.current = null;
      roadviewClientRef.current = null;
      propertyMarkerRef.current = null;
      selectedMarkerRef.current = null;
      infoWindowRef.current = null;
      clickHandlerRef.current = null;
      propertyPositionRef.current = null;
      selectedRoadviewPositionRef.current = null;
      panoIdRef.current = null;
      selectingRoadviewRef.current = false;
    };
  }, [listing]);

  useEffect(() => {
    const kakao = window.kakao;
    const map = mapInstanceRef.current;

    if (!kakao?.maps || !map) return;

    if (isSelectingRoadview) {
      map.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
      setMapMessage("지도에서 원하는 위치를 클릭하면 해당 지점의 로드뷰를 엽니다.");
    } else {
      map.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
      if (mapStatus === "ready" && roadviewStatus !== "empty") {
        setMapMessage("");
      }
    }
  }, [isSelectingRoadview, mapStatus, roadviewStatus]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (activeTab === "map" && mapInstanceRef.current) {
        mapInstanceRef.current.relayout();

        if (selectedRoadviewPositionRef.current) {
          mapInstanceRef.current.setCenter(selectedRoadviewPositionRef.current);
        } else if (propertyPositionRef.current) {
          mapInstanceRef.current.setCenter(propertyPositionRef.current);
        }
      }

      if (activeTab === "roadview" && roadviewInstanceRef.current) {
        roadviewInstanceRef.current.relayout();

        if (panoIdRef.current && selectedRoadviewPositionRef.current) {
          roadviewInstanceRef.current.setPanoId(
            panoIdRef.current,
            selectedRoadviewPositionRef.current
          );
        }
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeTab]);

  const fallbackQuery = encodeURIComponent(`${listing.region_name} ${listing.apt_name}`);
  const fallbackUrl = `https://map.kakao.com/link/search/${fallbackQuery}`;

  const handleSelectRoadviewFromMap = () => {
    setActiveTab("map");
    setIsSelectingRoadview(true);
    setRoadviewStatus("idle");
    setRoadviewMessage("지도에서 원하는 위치를 클릭해주세요.");
  };

  const handleOpenPropertyRoadview = () => {
    if (!propertyPositionRef.current) {
      setRoadviewStatus("error");
      setRoadviewMessage("매물 좌표를 아직 찾지 못했습니다.");
      return;
    }

    openRoadviewAt(propertyPositionRef.current, {
      switchTab: true,
      selectionSource: "property",
    });
  };

  const handleCancelSelection = () => {
    setIsSelectingRoadview(false);
    if (mapStatus === "ready") {
      setMapMessage("");
    }
  };

  const wrapperClass = embedded
    ? "bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
    : "bg-white rounded-2xl overflow-hidden w-full max-w-5xl mx-4 shadow-xl";

  const rootClass = embedded
    ? "w-full"
    : "fixed inset-0 bg-black/50 flex items-center justify-center z-50";

  return (
    <div className={rootClass}>
      <div className={wrapperClass}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">{listing.apt_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {listing.region_name} · {listing.area_size}㎡ · {listing.floor}층
            </p>
          </div>

          {!embedded && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-light"
            >
              ✕
            </button>
          )}
        </div>

        <div className="px-5 pt-4 flex flex-col gap-3">
          <div className="inline-flex bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab("map")}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                activeTab === "map"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              지도
            </button>
            <button
              onClick={() => setActiveTab("roadview")}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                activeTab === "roadview"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              로드뷰
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleOpenPropertyRoadview}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-semibold transition"
            >
              매물 위치 로드뷰
            </button>

            {!isSelectingRoadview ? (
              <button
                onClick={handleSelectRoadviewFromMap}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-semibold transition"
              >
                지도에서 로드뷰 선택
              </button>
            ) : (
              <button
                onClick={handleCancelSelection}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold transition"
              >
                선택 취소
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          <div
            ref={mapRef}
            className={`${activeTab === "map" ? "block" : "hidden"} w-full ${contentHeightClass} rounded-xl border border-gray-200 bg-gray-50`}
          />

          <div className={`${activeTab === "roadview" ? "block" : "hidden"} w-full`}>
            <div
              ref={roadviewRef}
              className={`w-full ${contentHeightClass} rounded-xl border border-gray-200 ${
                roadviewStatus === "ready" ? "bg-gray-50" : "bg-gray-100"
              }`}
            />

            {roadviewStatus !== "ready" && (
              <div className="mt-4 text-sm text-gray-500">{roadviewMessage}</div>
            )}

            {(roadviewStatus === "empty" || roadviewStatus === "error") && (
              <div className="mt-4">
                <a
                  href={fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-5 py-3 rounded-xl transition"
                >
                  카카오 지도에서 직접 열기
                </a>
              </div>
            )}
          </div>

          {activeTab === "map" && mapMessage && (
            <div className="mt-4 text-sm text-gray-500">{mapMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}