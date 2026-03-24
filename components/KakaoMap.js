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

    // 혹시 onload가 늦어지거나 누락되는 경우 대비
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
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const initializedRef = useRef(false);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [pointCount, setPointCount] = useState(0);

  const selectedListing = useMemo(
    () => listings.find((item) => item.id === selectedId) || null,
    [listings, selectedId]
  );

  // 1. 지도는 딱 한 번만 생성
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const kakao = await loadKakaoSdk();
        if (cancelled) return;

        if (!mapElRef.current) {
          throw new Error("지도 DOM을 찾지 못했습니다.");
        }

        if (!initializedRef.current) {
          const center = new kakao.maps.LatLng(37.5665, 126.9780);

          mapRef.current = new kakao.maps.Map(mapElRef.current, {
            center,
            level: 6,
          });

          initializedRef.current = true;
        }

        setStatus("ready");
        setError("");

        setTimeout(() => {
          try {
            mapRef.current?.relayout();
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

  // 2. 목록이 바뀌면 마커만 다시 그림
  useEffect(() => {
    if (status !== "ready") return;
    if (!window.kakao?.maps) return;
    if (!mapRef.current) return;

    const map = mapRef.current;
    const kakao = window.kakao;

    markersRef.current.forEach((marker) => marker.setMap(null));
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];

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

      if (listing.id === selectedId) {
        const overlay = new kakao.maps.CustomOverlay({
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
  }, [listings, selectedId, status]);

  // 3. 선택한 매물이 바뀌면 해당 위치로 이동 + 자동 확대
  useEffect(() => {
    if (status !== "ready") return;
    if (!selectedListing) return;
    if (!window.kakao?.maps) return;
    if (!mapRef.current) return;

    const map = mapRef.current;
    const kakao = window.kakao;

    const moveTo = (coords) => {
      try {
        map.panTo(coords);
        setTimeout(() => {
          try {
            map.setLevel(3);
          } catch {}
        }, 150);
      } catch {}
    };

    const lat = getLat(selectedListing);
    const lng = getLng(selectedListing);

    if (lat !== null && lng !== null) {
      moveTo(new kakao.maps.LatLng(lat, lng));
      return;
    }

    if (!kakao.maps.services) return;

    const places = new kakao.maps.services.Places();
    const keyword = `${getDongName(selectedListing)} ${getAptName(selectedListing)}`.trim();

    if (!keyword) return;

    places.keywordSearch(keyword, (result, searchStatus) => {
      if (searchStatus === kakao.maps.services.Status.OK && result?.[0]) {
        const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
        moveTo(coords);
      }
    });
  }, [selectedListing, status]);

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

      {showNoPointOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 px-6 text-center pointer-events-none">
          <p className="text-sm font-semibold text-slate-500 bg-white/80 px-4 py-2 rounded-lg">
            지도에 표시할 좌표를 찾지 못했습니다.
          </p>
        </div>
      )}

      <div ref={mapElRef} className="w-full h-full absolute inset-0" />
    </div>
  );
}