"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

// 브라우저 전역에 SDK 로딩 Promise를 1번만 저장
function loadKakaoSdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is undefined"));
  }

  if (!KAKAO_MAP_KEY) {
    return Promise.reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY가 없습니다."));
  }

  if (window.kakao?.maps?.Map) {
    return Promise.resolve(window.kakao);
  }

  if (window.__kakaoSdkPromise) {
    return window.__kakaoSdkPromise;
  }

  window.__kakaoSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-kakao-map="true"]');

    const finishLoad = () => {
      if (window.kakao?.maps?.Map) {
        resolve(window.kakao);
        return;
      }

      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => {
          if (window.kakao?.maps?.Map) {
            resolve(window.kakao);
          } else {
            reject(new Error("카카오맵 SDK 초기화에 실패했습니다."));
          }
        });
        return;
      }

      reject(new Error("카카오맵 SDK를 찾지 못했습니다."));
    };

    if (existing) {
      existing.addEventListener("load", finishLoad, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("카카오맵 SDK 스크립트 로드 실패")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.defer = true;
    script.dataset.kakaoMap = "true";

    script.onload = finishLoad;
    script.onerror = () => reject(new Error("카카오맵 SDK 스크립트 로드 실패"));

    document.head.appendChild(script);

    setTimeout(() => {
      if (window.kakao?.maps?.Map) {
        resolve(window.kakao);
      }
    }, 3000);
  });

  return window.__kakaoSdkPromise;
}

function getAptName(item) {
  return item?.apt_name || item?.properties?.apt_name || "";
}

function getDongName(item) {
  return item?.dong_name || item?.region_name || item?.properties?.dong || "";
}

function getLat(item) {
  const v = item?.lat ?? item?.properties?.lat;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getLng(item) {
  const v = item?.lng ?? item?.properties?.lng;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function KakaoMap({ listings = [], selectedId = null }) {
  const mapElRef = useRef(null);
  const roadviewElRef = useRef(null);

  const mapRef = useRef(null);
  const roadviewRef = useRef(null);
  const roadviewClientRef = useRef(null);

  const markersRef = useRef([]);
  const selectionOverlayRef = useRef(null);
  const coordsByIdRef = useRef(new Map());
  const initializedRef = useRef(false);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [pointCount, setPointCount] = useState(0);
  const [viewMode, setViewMode] = useState("split"); // map | roadview | split
  const [roadviewMessage, setRoadviewMessage] = useState("매물을 선택하면 스트리트 뷰를 표시합니다.");

  const selectedListing = useMemo(
    () => listings.find((item) => item.id === selectedId) || null,
    [listings, selectedId]
  );

  // 1) SDK 로드 + 지도/로드뷰 1회 생성
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const kakao = await loadKakaoSdk();
        if (cancelled) return;

        if (!mapElRef.current || !roadviewElRef.current) {
          throw new Error("지도 또는 로드뷰 DOM을 찾지 못했습니다.");
        }

        if (!initializedRef.current) {
          const center = new kakao.maps.LatLng(37.5665, 126.9780);

          mapRef.current = new kakao.maps.Map(mapElRef.current, {
            center,
            level: 6,
          });

          roadviewRef.current = new kakao.maps.Roadview(roadviewElRef.current);
          roadviewClientRef.current = new kakao.maps.RoadviewClient();

          initializedRef.current = true;
        }

        setStatus("ready");
        setError("");

        setTimeout(() => {
          try {
            mapRef.current?.relayout();
          } catch {}
          try {
            roadviewRef.current?.relayout();
          } catch {}
        }, 80);
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err?.message || "지도 초기화에 실패했습니다.");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) 목록이 바뀔 때만 전체 마커 갱신 + bounds
  useEffect(() => {
    if (status !== "ready") return;
    if (!window.kakao?.maps) return;
    if (!mapRef.current) return;

    const map = mapRef.current;
    const kakao = window.kakao;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (selectionOverlayRef.current) {
      selectionOverlayRef.current.setMap(null);
      selectionOverlayRef.current = null;
    }

    coordsByIdRef.current = new Map();

    if (!listings.length) {
      setPointCount(0);
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();
    const places = kakao.maps.services ? new kakao.maps.services.Places() : null;

    let found = 0;
    let completed = 0;

    const finalize = () => {
      completed += 1;

      if (completed === listings.length) {
        setPointCount(found);

        if (found > 0) {
          try {
            map.setBounds(bounds);
            setTimeout(() => {
              try {
                map.relayout();
              } catch {}
            }, 80);
          } catch {}
        }
      }
    };

    const paintMarker = (listing, coords) => {
      const marker = new kakao.maps.Marker({
        position: coords,
      });

      marker.setMap(map);
      markersRef.current.push(marker);
      coordsByIdRef.current.set(listing.id, coords);

      bounds.extend(coords);
      found += 1;
    };

    listings.forEach((listing) => {
      const lat = getLat(listing);
      const lng = getLng(listing);

      if (lat !== null && lng !== null) {
        const coords = new kakao.maps.LatLng(lat, lng);
        paintMarker(listing, coords);
        finalize();
        return;
      }

      if (!places) {
        finalize();
        return;
      }

      const keyword = `${getDongName(listing)} ${getAptName(listing)}`.trim();

      if (!keyword) {
        finalize();
        return;
      }

      places.keywordSearch(keyword, (result, searchStatus) => {
        if (searchStatus === kakao.maps.services.Status.OK && result?.[0]) {
          const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
          paintMarker(listing, coords);
        }
        finalize();
      });
    });
  }, [listings, status]);

  // 3) 선택한 매물로 지도 이동 + 확대 + 스트리트뷰 표시
  useEffect(() => {
    if (status !== "ready") return;
    if (!selectedListing) {
      setRoadviewMessage("매물을 선택하면 스트리트 뷰를 표시합니다.");
      return;
    }
    if (!window.kakao?.maps) return;
    if (!mapRef.current || !roadviewRef.current || !roadviewClientRef.current) return;

    const map = mapRef.current;
    const roadview = roadviewRef.current;
    const roadviewClient = roadviewClientRef.current;
    const kakao = window.kakao;

    if (selectionOverlayRef.current) {
      selectionOverlayRef.current.setMap(null);
      selectionOverlayRef.current = null;
    }

    const showSelection = (coords) => {
      try {
        map.panTo(coords);

        setTimeout(() => {
          try {
            map.setLevel(2);
          } catch {}
        }, 120);

        const overlay = new kakao.maps.CustomOverlay({
          position: coords,
          yAnchor: 1.8,
          content: `
            <div style="
              background:#dc2626;
              color:white;
              padding:10px 12px;
              border-radius:12px;
              font-size:12px;
              font-weight:800;
              box-shadow:0 6px 18px rgba(0,0,0,0.22);
              white-space:nowrap;
              border:2px solid white;
            ">
              ${getAptName(selectedListing) || "선택 매물"}
            </div>
          `,
        });

        overlay.setMap(map);
        selectionOverlayRef.current = overlay;
      } catch {}

      // 공식 문서 방식: getNearestPanoId -> setPanoId
      // 가까운 로드뷰가 없으면 null이 반환될 수 있음
      roadviewClient.getNearestPanoId(coords, 50, (panoId) => {
        if (panoId) {
          try {
            roadview.setPanoId(panoId, coords);
            setRoadviewMessage("");
          } catch {
            setRoadviewMessage("스트리트 뷰를 표시하지 못했습니다.");
          }
          return;
        }

        // 50m 내에 없으면 한 번 더 넓게 시도
        roadviewClient.getNearestPanoId(coords, 200, (fallbackPanoId) => {
          if (fallbackPanoId) {
            try {
              roadview.setPanoId(fallbackPanoId, coords);
              setRoadviewMessage("");
            } catch {
              setRoadviewMessage("스트리트 뷰를 표시하지 못했습니다.");
            }
          } else {
            setRoadviewMessage("선택한 매물 근처에 스트리트 뷰가 없습니다.");
          }
        });
      });
    };

    const savedCoords = coordsByIdRef.current.get(selectedListing.id);
    if (savedCoords) {
      showSelection(savedCoords);
      return;
    }

    const lat = getLat(selectedListing);
    const lng = getLng(selectedListing);

    if (lat !== null && lng !== null) {
      showSelection(new kakao.maps.LatLng(lat, lng));
      return;
    }

    if (!kakao.maps.services) return;

    const places = new kakao.maps.services.Places();
    const keyword = `${getDongName(selectedListing)} ${getAptName(selectedListing)}`.trim();

    if (!keyword) {
      setRoadviewMessage("선택한 매물의 위치 키워드를 찾지 못했습니다.");
      return;
    }

    places.keywordSearch(keyword, (result, searchStatus) => {
      if (searchStatus === kakao.maps.services.Status.OK && result?.[0]) {
        const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
        coordsByIdRef.current.set(selectedListing.id, coords);
        showSelection(coords);
      } else {
        setRoadviewMessage("선택한 매물의 좌표를 찾지 못했습니다.");
      }
    });
  }, [selectedListing, status]);

  useEffect(() => {
    if (status !== "ready") return;

    setTimeout(() => {
      try {
        mapRef.current?.relayout();
      } catch {}
      try {
        roadviewRef.current?.relayout();
      } catch {}
    }, 100);
  }, [viewMode, status]);

  const showNoPointOverlay = status === "ready" && listings.length > 0 && pointCount === 0;

  return (
    <div className="w-full h-full min-h-[520px] relative bg-slate-100 overflow-hidden">
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-20">
          <span className="text-slate-400 font-bold tracking-widest uppercase animate-pulse text-sm">
            지도 엔진 초기화 중...
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-20 px-6 text-center">
          <p className="text-red-500 font-semibold mb-2">지도를 불러오지 못했습니다.</p>
          <p className="text-sm text-slate-500 whitespace-pre-wrap">{error}</p>
        </div>
      )}

      <div className="absolute top-6 right-6 z-30 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] p-1 flex border border-slate-200 gap-1">
        <button
          onClick={() => setViewMode("map")}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-md transition-all ${
            viewMode === "map" ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-gray-900"
          }`}
        >
          지도
        </button>
        <button
          onClick={() => setViewMode("split")}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-md transition-all ${
            viewMode === "split" ? "bg-red-600 text-white shadow-sm" : "text-gray-400 hover:text-red-600"
          }`}
        >
          분할
        </button>
        <button
          onClick={() => setViewMode("roadview")}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-md transition-all ${
            viewMode === "roadview" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-blue-600"
          }`}
        >
          스트리트뷰
        </button>
      </div>

      {showNoPointOverlay && viewMode !== "roadview" && (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 px-6 text-center pointer-events-none">
          <p className="text-sm font-semibold text-slate-500 bg-white/80 px-4 py-2 rounded-lg">
            지도에 표시할 좌표를 찾지 못했습니다.
          </p>
        </div>
      )}

      {viewMode === "map" && (
        <div ref={mapElRef} className="w-full h-full absolute inset-0" />
      )}

      {viewMode === "roadview" && (
        <div className="w-full h-full absolute inset-0">
          <div ref={roadviewElRef} className="w-full h-full" />
          {roadviewMessage && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm font-semibold text-slate-500 bg-white/85 px-4 py-2 rounded-lg">
                {roadviewMessage}
              </p>
            </div>
          )}
        </div>
      )}

      {viewMode === "split" && (
        <div className="w-full h-full absolute inset-0 grid grid-cols-2">
          <div className="relative border-r border-white/60">
            <div ref={mapElRef} className="w-full h-full" />
            {showNoPointOverlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 px-6 text-center pointer-events-none">
                <p className="text-sm font-semibold text-slate-500 bg-white/80 px-4 py-2 rounded-lg">
                  지도에 표시할 좌표를 찾지 못했습니다.
                </p>
              </div>
            )}
          </div>
          <div className="relative">
            <div ref={roadviewElRef} className="w-full h-full" />
            {roadviewMessage && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm font-semibold text-slate-500 bg-white/85 px-4 py-2 rounded-lg">
                  {roadviewMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}