"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

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
  const overlaysRef = useRef([]);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("map"); // map | roadview
  const [pointCount, setPointCount] = useState(0);

  const selectedListing = useMemo(
    () => listings.find((item) => item.id === selectedId) || null,
    [listings, selectedId]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!KAKAO_MAP_KEY) {
      setStatus("error");
      setError("NEXT_PUBLIC_KAKAO_MAP_KEY가 없습니다.");
      return;
    }

    let cancelled = false;

    const initMap = () => {
      if (!window.kakao?.maps) {
        setStatus("error");
        setError("카카오맵 SDK를 찾지 못했습니다.");
        return;
      }

      window.kakao.maps.load(() => {
        if (cancelled) return;
        if (!mapElRef.current || !roadviewElRef.current) return;

        try {
          const center = new window.kakao.maps.LatLng(37.5665, 126.978);
          const map = new window.kakao.maps.Map(mapElRef.current, {
            center,
            level: 6,
          });

          const roadview = new window.kakao.maps.Roadview(roadviewElRef.current);
          const roadviewClient = new window.kakao.maps.RoadviewClient();

          mapRef.current = map;
          roadviewRef.current = roadview;
          roadviewClientRef.current = roadviewClient;

          setStatus("ready");
          setError("");

          setTimeout(() => {
            map.relayout();
          }, 50);
        } catch (err) {
          setStatus("error");
          setError(err?.message || "지도 초기화에 실패했습니다.");
        }
      });
    };

    if (window.kakao?.maps) {
      initMap();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector('script[data-kakao-map="true"]');
    if (existing) {
      existing.addEventListener("load", initMap, { once: true });
      existing.addEventListener(
        "error",
        () => {
          setStatus("error");
          setError("카카오맵 SDK 스크립트 로드 실패");
        },
        { once: true }
      );
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services,roadview`;
    script.async = true;
    script.defer = true;
    script.dataset.kakaoMap = "true";

    script.onload = initMap;
    script.onerror = () => {
      setStatus("error");
      setError("카카오맵 SDK 스크립트 로드 실패. 앱 키와 도메인 등록을 확인하세요.");
    };

    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    if (!window.kakao?.maps) return;
    if (!mapRef.current) return;

    const map = mapRef.current;

    markersRef.current.forEach((marker) => marker.setMap(null));
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];

    if (!listings.length) {
      setPointCount(0);
      return;
    }

    const bounds = new window.kakao.maps.LatLngBounds();
    let found = 0;
    let completed = 0;

    const finalize = () => {
      completed += 1;
      if (completed === listings.length) {
        setPointCount(found);
        if (found > 0) {
          map.setBounds(bounds);
          setTimeout(() => map.relayout(), 50);
        }
      }
    };

    const paintMarker = (listing, coords) => {
      const marker = new window.kakao.maps.Marker({
        position: coords,
      });
      marker.setMap(map);
      markersRef.current.push(marker);

      if (listing.id === selectedId) {
        const overlay = new window.kakao.maps.CustomOverlay({
          position: coords,
          yAnchor: 1.8,
          content: `
            <div style="
              background:#111827;
              color:white;
              padding:8px 10px;
              border-radius:10px;
              font-size:12px;
              font-weight:700;
              box-shadow:0 4px 14px rgba(0,0,0,0.18);
              white-space:nowrap;
            ">
              ${getAptName(listing) || "선택 매물"}
            </div>
          `,
        });
        overlay.setMap(map);
        overlaysRef.current.push(overlay);
      }

      bounds.extend(coords);
      found += 1;
    };

    const places = window.kakao.maps.services
      ? new window.kakao.maps.services.Places()
      : null;

    listings.forEach((listing) => {
      const lat = getLat(listing);
      const lng = getLng(listing);

      if (lat !== null && lng !== null) {
        const coords = new window.kakao.maps.LatLng(lat, lng);
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
        if (searchStatus === window.kakao.maps.services.Status.OK && result?.[0]) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          paintMarker(listing, coords);
        }
        finalize();
      });
    });
  }, [listings, selectedId, status]);

  useEffect(() => {
    if (status !== "ready") return;
    if (!selectedListing) return;
    if (!mapRef.current || !roadviewRef.current || !roadviewClientRef.current) return;

    const map = mapRef.current;
    const roadview = roadviewRef.current;
    const roadviewClient = roadviewClientRef.current;

    const lat = getLat(selectedListing);
    const lng = getLng(selectedListing);

    const moveTo = (coords) => {
      map.panTo(coords);

      if (viewMode === "roadview") {
        roadviewClient.getNearestPanoId(coords, 300, (panoId) => {
          if (panoId) {
            roadview.setPanoId(panoId, coords);
          }
        });
      }
    };

    if (lat !== null && lng !== null) {
      moveTo(new window.kakao.maps.LatLng(lat, lng));
      return;
    }

    if (!window.kakao?.maps?.services) return;
    const places = new window.kakao.maps.services.Places();
    const keyword = `${getDongName(selectedListing)} ${getAptName(selectedListing)}`.trim();

    if (!keyword) return;

    places.keywordSearch(keyword, (result, searchStatus) => {
      if (searchStatus === window.kakao.maps.services.Status.OK && result?.[0]) {
        const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
        moveTo(coords);
      }
    });
  }, [selectedListing, viewMode, status]);

  useEffect(() => {
    if (viewMode === "map" && mapRef.current) {
      setTimeout(() => mapRef.current?.relayout(), 50);
    }
    if (viewMode === "roadview" && roadviewRef.current) {
      setTimeout(() => roadviewRef.current?.relayout(), 50);
    }
  }, [viewMode]);

  return (
    <div className="w-full h-full min-h-[520px] relative bg-slate-100 overflow-hidden rounded-2xl border border-gray-200">
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-20">
          <span className="text-slate-400 font-bold tracking-widest uppercase animate-pulse text-sm">
            위성 데이터 수신 중...
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-20 px-6 text-center">
          <p className="text-red-500 font-semibold mb-2">지도를 불러오지 못했습니다.</p>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      )}

      {status === "ready" && pointCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10 px-6 text-center">
          <p className="text-sm font-semibold text-slate-500">
            지도에 표시할 좌표를 찾지 못했습니다.
          </p>
        </div>
      )}

      <div className="absolute top-6 right-6 z-30 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] p-1 flex border border-slate-200">
        <button
          onClick={() => setViewMode("map")}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-md transition-all ${
            viewMode === "map" ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-gray-900"
          }`}
        >
          레이더 맵
        </button>
        <button
          onClick={() => setViewMode("roadview")}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-md transition-all ${
            viewMode === "roadview" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-blue-600"
          }`}
        >
          스트리트 뷰
        </button>
      </div>

      <div
        ref={mapElRef}
        className={`w-full h-full absolute inset-0 transition-opacity duration-300 ${
          viewMode === "map" ? "opacity-100 z-0" : "opacity-0 pointer-events-none"
        }`}
      />

      <div
        ref={roadviewElRef}
        className={`w-full h-full absolute inset-0 transition-opacity duration-300 ${
          viewMode === "roadview" ? "opacity-100 z-0" : "opacity-0 pointer-events-none"
        }`}
      />
    </div>
  );
}