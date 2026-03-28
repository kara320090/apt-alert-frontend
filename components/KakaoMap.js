"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const COORDS_CACHE_KEY = "apt-alert-coords-cache-v4";

function readCoordsCache() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(COORDS_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCoordsCache(cache) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COORDS_CACHE_KEY, JSON.stringify(cache));
  } catch {}
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

function makeCoordsCacheKey(item) {
  return `${getDongName(item)}|${getAptName(item)}`.trim();
}

function formatPriceText(value) {
  const price = Number(value || 0);
  const uk = Math.floor(price / 10000);
  const man = price % 10000;
  if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}만`;
  if (uk > 0) return `${uk}억`;
  return `${price.toLocaleString()}만`;
}

function getDiscountAmount(item) {
  return Math.max(0, Number(item?.market_avg || 0) - Number(item?.price || 0));
}

function makeMarkerImage(fill, size = 18) {
  if (typeof window === "undefined" || !window.kakao?.maps?.Size) return null;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7" fill="${fill}" stroke="#ffffff" stroke-width="3" />
    </svg>
  `.trim();

  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");

  return new window.kakao.maps.MarkerImage(
    `data:image/svg+xml;charset=UTF-8,${encoded}`,
    new window.kakao.maps.Size(size, size)
  );
}

function updateMarkerSelection(markerByIdRef, selectedId) {
  if (typeof window === "undefined" || !window.kakao?.maps) return;

  const normalImage = makeMarkerImage("#334155", 18);
  const selectedImage = makeMarkerImage("#dc2626", 26);

  markerByIdRef.current.forEach((marker, id) => {
    try {
      marker.setImage(id === selectedId ? selectedImage : normalImage);
      marker.setZIndex(id === selectedId ? 10 : 1);
    } catch {}
  });
}

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

export default function KakaoMap({ listings = [], selectedId = null, onSelectListing, selectedListing }) {
  const rootRef = useRef(null);
  const mapPaneRef = useRef(null);
  const roadPaneRef = useRef(null);

  const mapRef = useRef(null);
  const roadviewRef = useRef(null);
  const roadviewClientRef = useRef(null);

  const markersRef = useRef([]);
  const markerByIdRef = useRef(new Map());
  const selectionOverlayRef = useRef(null);
  const pulseOverlayRef = useRef(null);
  const coordsByIdRef = useRef(new Map());
  const initializedRef = useRef(false);
  const selectedIdRef = useRef(selectedId);

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [pointCount, setPointCount] = useState(0);
  const [viewMode, setViewMode] = useState("split");
  const [roadviewMessage, setRoadviewMessage] = useState("매물을 선택하면 스트리트뷰를 함께 보여드립니다.");
  const [searchingCoords, setSearchingCoords] = useState(false);

  const resolvedSelectedListing = useMemo(
    () => selectedListing || listings.find((item) => item.id === selectedId) || null,
    [listings, selectedId, selectedListing]
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const kakao = await loadKakaoSdk();
        if (cancelled) return;

        if (!mapPaneRef.current || !roadPaneRef.current) {
          throw new Error("지도 또는 로드뷰 DOM을 찾지 못했습니다.");
        }

        if (!initializedRef.current) {
          const center = new kakao.maps.LatLng(37.5665, 126.9780);

          mapRef.current = new kakao.maps.Map(mapPaneRef.current, {
            center,
            level: 6,
          });

          roadviewRef.current = new kakao.maps.Roadview(roadPaneRef.current);
          roadviewClientRef.current = new kakao.maps.RoadviewClient();
          initializedRef.current = true;
        }

        setStatus("ready");
        setError("");
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

  useEffect(() => {
    if (status !== "ready") return;
    if (!rootRef.current) return;

    const relayout = () => {
      try {
        mapRef.current?.relayout();
      } catch {}
      try {
        roadviewRef.current?.relayout();
      } catch {}
    };

    const observer = new ResizeObserver(() => {
      setTimeout(relayout, 80);
    });

    observer.observe(rootRef.current);
    setTimeout(relayout, 80);

    return () => observer.disconnect();
  }, [status, viewMode]);

  // Marker drawing only when listing set changes
  useEffect(() => {
    if (status !== "ready") return;
    if (!window.kakao?.maps) return;
    if (!mapRef.current) return;

    const map = mapRef.current;
    const kakao = window.kakao;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    markerByIdRef.current = new Map();

    coordsByIdRef.current = new Map();

    if (!listings.length) {
      setPointCount(0);
      setSearchingCoords(false);
      return;
    }

    let cancelled = false;

    const bounds = new kakao.maps.LatLngBounds();
    const places = kakao.maps.services ? new kakao.maps.services.Places() : null;
    const cache = readCoordsCache();

    let found = 0;
    let completed = 0;
    let pendingSearches = 0;

    const maybeFitBounds = () => {
      if (found > 0 && !selectedIdRef.current) {
        try {
          map.setBounds(bounds);
          setTimeout(() => {
            try {
              map.relayout();
            } catch {}
          }, 80);
        } catch {}
      }
    };

    const finalize = () => {
      completed += 1;
      setSearchingCoords(pendingSearches > 0);

      if (completed === listings.length) {
        setPointCount(found);
        setSearchingCoords(false);
        maybeFitBounds();
        updateMarkerSelection(markerByIdRef, selectedIdRef.current);
      }
    };

    const paintMarker = (listing, coords) => {
      const marker = new kakao.maps.Marker({
        position: coords,
        image: makeMarkerImage("#334155", 18),
      });

      marker.setMap(map);
      markersRef.current.push(marker);
      markerByIdRef.current.set(listing.id, marker);
      coordsByIdRef.current.set(listing.id, coords);

      kakao.maps.event.addListener(marker, "click", () => {
        onSelectListing?.(listing.id);
      });

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

      const cacheKey = makeCoordsCacheKey(listing);
      const cached = cache[cacheKey];
      if (cached?.lat && cached?.lng) {
        const coords = new kakao.maps.LatLng(cached.lat, cached.lng);
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

      pendingSearches += 1;
      setSearchingCoords(true);

      places.keywordSearch(keyword, (result, searchStatus) => {
        if (cancelled) return;
        pendingSearches -= 1;
        if (searchStatus === kakao.maps.services.Status.OK && result?.[0]) {
          const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
          paintMarker(listing, coords);
          cache[cacheKey] = {
            lat: Number(result[0].y),
            lng: Number(result[0].x),
          };
          writeCoordsCache(cache);
        }
        finalize();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [listings, status, onSelectListing]);

  useEffect(() => {
    if (status !== "ready") return;
    updateMarkerSelection(markerByIdRef, selectedId);
  }, [selectedId, status]);

  useEffect(() => {
    if (status !== "ready") return;
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
    if (pulseOverlayRef.current) {
      pulseOverlayRef.current.setMap(null);
      pulseOverlayRef.current = null;
    }

    if (!resolvedSelectedListing) {
      setRoadviewMessage("매물을 선택하면 스트리트뷰를 함께 보여드립니다.");
      return;
    }

    const showSelection = (coords) => {
      try {
        map.panTo(coords);
        setTimeout(() => {
          try {
            map.setLevel(2);
          } catch {}
        }, 180);

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
              ${getAptName(resolvedSelectedListing) || "선택 매물"}
            </div>
          `,
        });
        overlay.setMap(map);
        selectionOverlayRef.current = overlay;

        const pulse = new kakao.maps.CustomOverlay({
          position: coords,
          yAnchor: 0.5,
          content: `
            <div style="
              width:20px;
              height:20px;
              border-radius:9999px;
              background:rgba(220,38,38,0.25);
              box-shadow:0 0 0 0 rgba(220,38,38,0.35);
              animation:pulse-marker 1.6s infinite;
              border:2px solid rgba(220,38,38,0.5);
            "></div>
          `,
        });
        pulse.setMap(map);
        pulseOverlayRef.current = pulse;
      } catch {}

      roadviewClient.getNearestPanoId(coords, 50, (panoId) => {
        if (panoId) {
          try {
            roadview.setPanoId(panoId, coords);
            setRoadviewMessage("");
          } catch {
            setRoadviewMessage("스트리트뷰를 표시하지 못했습니다.");
          }
          return;
        }

        roadviewClient.getNearestPanoId(coords, 200, (fallbackPanoId) => {
          if (fallbackPanoId) {
            try {
              roadview.setPanoId(fallbackPanoId, coords);
              setRoadviewMessage("가장 가까운 도로 기준 스트리트뷰를 보여드립니다.");
            } catch {
              setRoadviewMessage("스트리트뷰를 표시하지 못했습니다.");
            }
          } else {
            setRoadviewMessage("선택한 매물 근처에 스트리트뷰가 없습니다. 지도로 위치를 확인해주세요.");
          }
        });
      });
    };

    const savedCoords = coordsByIdRef.current.get(resolvedSelectedListing.id);
    if (savedCoords) {
      showSelection(savedCoords);
      return;
    }

    const lat = getLat(resolvedSelectedListing);
    const lng = getLng(resolvedSelectedListing);
    if (lat !== null && lng !== null) {
      showSelection(new kakao.maps.LatLng(lat, lng));
      return;
    }

    if (!kakao.maps.services) return;

    const cache = readCoordsCache();
    const cacheKey = makeCoordsCacheKey(resolvedSelectedListing);
    const cached = cache[cacheKey];
    if (cached?.lat && cached?.lng) {
      const coords = new kakao.maps.LatLng(cached.lat, cached.lng);
      coordsByIdRef.current.set(resolvedSelectedListing.id, coords);
      showSelection(coords);
      return;
    }

    const places = new kakao.maps.services.Places();
    const keyword = `${getDongName(resolvedSelectedListing)} ${getAptName(resolvedSelectedListing)}`.trim();
    if (!keyword) {
      setRoadviewMessage("선택한 매물의 위치 키워드를 찾지 못했습니다.");
      return;
    }

    setSearchingCoords(true);
    places.keywordSearch(keyword, (result, searchStatus) => {
      setSearchingCoords(false);
      if (searchStatus === kakao.maps.services.Status.OK && result?.[0]) {
        const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
        coordsByIdRef.current.set(resolvedSelectedListing.id, coords);
        cache[cacheKey] = { lat: Number(result[0].y), lng: Number(result[0].x) };
        writeCoordsCache(cache);
        showSelection(coords);
      } else {
        setRoadviewMessage("선택한 매물의 좌표를 찾지 못했습니다.");
      }
    });
  }, [resolvedSelectedListing, status]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "pulse-marker-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @keyframes pulse-marker {
        0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
        70% { transform: scale(1.35); box-shadow: 0 0 0 14px rgba(220,38,38,0); }
        100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(220,38,38,0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const showNoPointOverlay = status === "ready" && listings.length > 0 && pointCount === 0;

  return (
    <div ref={rootRef} className="w-full h-full min-h-[520px] relative bg-slate-100 overflow-hidden">
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

      {searchingCoords && (
        <div className="absolute left-6 bottom-6 z-30 pointer-events-none">
          <div className="bg-white/90 border border-slate-200 rounded-xl px-4 py-2 shadow-md text-xs font-bold text-slate-600">
            매물 좌표를 찾는 중...
          </div>
        </div>
      )}

      {resolvedSelectedListing && status === "ready" && (
        <div className="absolute top-6 left-6 z-30 bg-white/92 backdrop-blur border border-slate-200 rounded-2xl shadow-xl px-4 py-3 min-w-[260px] max-w-[320px]">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">선택 매물</div>
          <div className="text-sm font-black text-slate-900 break-keep">{getAptName(resolvedSelectedListing) || "이름 없음"}</div>
          <div className="text-xs text-slate-500 font-semibold mt-1 break-keep">
            {getDongName(resolvedSelectedListing) || "지역 정보 없음"}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <div className="text-slate-400 font-bold">매매가</div>
              <div className="text-slate-900 font-black mt-1">{formatPriceText(resolvedSelectedListing?.price)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <div className="text-slate-400 font-bold">절감액</div>
              <div className="text-red-600 font-black mt-1">{formatPriceText(getDiscountAmount(resolvedSelectedListing))}</div>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <div className="text-slate-400 font-bold">면적</div>
              <div className="text-slate-900 font-black mt-1">{resolvedSelectedListing?.area_size || "-"}㎡</div>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <div className="text-slate-400 font-bold">층수</div>
              <div className="text-slate-900 font-black mt-1">{resolvedSelectedListing?.floor || "-"}층</div>
            </div>
          </div>
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

      <div className="absolute inset-0">
        <div
          className={`absolute inset-0 transition-all duration-300 ${
            viewMode === "map" ? "w-full h-full opacity-100" : viewMode === "split" ? "w-1/2 h-full left-0 opacity-100" : "w-0 h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div ref={mapPaneRef} className="w-full h-full" />
          {showNoPointOverlay && viewMode !== "roadview" && (
            <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 px-6 text-center pointer-events-none">
              <p className="text-sm font-semibold text-slate-500 bg-white/80 px-4 py-2 rounded-lg">
                지도에 표시할 좌표를 찾지 못했습니다.
              </p>
            </div>
          )}
        </div>

        <div
          className={`absolute inset-y-0 right-0 transition-all duration-300 ${
            viewMode === "roadview" ? "w-full h-full opacity-100" : viewMode === "split" ? "w-1/2 h-full opacity-100" : "w-0 h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div ref={roadPaneRef} className="w-full h-full" />
          {roadviewMessage && (viewMode === "roadview" || viewMode === "split") && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm font-semibold text-slate-500 bg-white/85 px-4 py-2 rounded-lg text-center mx-6">
                {roadviewMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
