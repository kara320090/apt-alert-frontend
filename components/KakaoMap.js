"use client";

import { useEffect, useRef, useState } from "react";

const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

export default function KakaoMap({ listings = [], selectedId = null }) {
  const mapRef = useRef(null);
  const roadviewRef = useRef(null);
  
  const mapInstanceRef = useRef(null);
  const roadviewInstanceRef = useRef(null);
  const roadviewClientRef = useRef(null);
  const markersRef = useRef({});
  
  const [mapStatus, setMapStatus] = useState("loading");
  const [activeView, setActiveView] = useState("map"); // 'map' or 'roadview'

  useEffect(() => {
    if (typeof window === "undefined" || !KAKAO_MAP_KEY) return;

    const initKakao = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current || !roadviewRef.current) return;
        
        // 1. Init Map
        const center = new window.kakao.maps.LatLng(37.5665, 126.9780);
        const map = new window.kakao.maps.Map(mapRef.current, { center, level: 6 });
        
        // 2. Init Roadview
        const roadview = new window.kakao.maps.Roadview(roadviewRef.current);
        const roadviewClient = new window.kakao.maps.RoadviewClient();

        mapInstanceRef.current = map;
        roadviewInstanceRef.current = roadview;
        roadviewClientRef.current = roadviewClient;
        
        setMapStatus("ready");
      });
    };

    if (window.kakao && window.kakao.maps) {
      initKakao();
    } else {
      const script = document.createElement("script");
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`;
      script.onload = initKakao;
      document.head.appendChild(script);
    }
  }, []);

  // Plot Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao?.maps?.services) return;

    Object.values(markersRef.current).forEach(m => m.overlay.setMap(null));
    markersRef.current = {};

    const geocoder = new window.kakao.maps.services.Geocoder();
    const bounds = new window.kakao.maps.LatLngBounds();
    let boundsExtended = false;

    listings.forEach((listing) => {
      const address = `${listing.region_name} ${listing.apt_name}`;
      
      geocoder.addressSearch(address, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          const isSuper = listing.grade === "초급매";
          
          const content = `
            <div class="px-2.5 py-1 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] border-2 ${isSuper ? 'border-red-600' : 'border-orange-500'} text-[11px] font-black text-gray-900 whitespace-nowrap transition-transform hover:scale-110">
              <span class="${isSuper ? 'text-red-600' : 'text-orange-500'}">-${listing.discount_rate}%</span> 
              ${Math.floor(listing.price/10000)}억
            </div>
          `;

          const customOverlay = new window.kakao.maps.CustomOverlay({
            position: coords,
            content: content,
            yAnchor: 1
          });

          customOverlay.setMap(map);
          markersRef.current[listing.id] = { overlay: customOverlay, coords };

          bounds.extend(coords);
          boundsExtended = true;
          
          if (boundsExtended) map.setBounds(bounds);
        }
      });
    });
  }, [listings, mapStatus]);

  // Handle Hover -> Map Pan & Roadview Sync
  useEffect(() => {
    const map = mapInstanceRef.current;
    const rv = roadviewInstanceRef.current;
    const rvClient = roadviewClientRef.current;

    if (!map || !rv || !rvClient) return;

    Object.values(markersRef.current).forEach(m => m.overlay.setZIndex(1));

    if (selectedId && markersRef.current[selectedId]) {
      const target = markersRef.current[selectedId];
      target.overlay.setZIndex(50);
      
      // Pan Map
      map.panTo(target.coords);

      // Sync Roadview if active
      if (activeView === "roadview") {
        rvClient.getNearestPanoId(target.coords, 50, (panoId) => {
          if (panoId) rv.setPanoId(panoId, target.coords);
        });
      }
    }
  }, [selectedId, activeView]);

  // Re-layout maps when toggling visibility
  useEffect(() => {
    setTimeout(() => {
      if (activeView === "map" && mapInstanceRef.current) mapInstanceRef.current.relayout();
      if (activeView === "roadview" && roadviewInstanceRef.current) roadviewInstanceRef.current.relayout();
    }, 50);
  }, [activeView]);

  return (
    <div className="w-full h-full relative bg-slate-100 overflow-hidden">
      
      {/* Loading State */}
      {mapStatus === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-20">
          <span className="text-slate-400 font-bold tracking-widest uppercase animate-pulse text-sm">위성 데이터 수신 중...</span>
        </div>
      )}

      {/* Floating View Toggle */}
      <div className="absolute top-6 right-6 z-30 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] p-1 flex border border-slate-200">
        <button 
          onClick={() => setActiveView("map")}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-md transition-all ${
            activeView === "map" ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-gray-900"
          }`}
        >
          레이더 맵
        </button>
        <button 
          onClick={() => setActiveView("roadview")}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-md transition-all ${
            activeView === "roadview" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-blue-600"
          }`}
        >
          스트리트 뷰
        </button>
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className={`w-full h-full absolute inset-0 transition-opacity duration-300 ${activeView === "map" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"}`} 
      />

      {/* Roadview Container */}
      <div 
        ref={roadviewRef} 
        className={`w-full h-full absolute inset-0 transition-opacity duration-300 ${activeView === "roadview" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"}`} 
      />

    </div>
  );
}