"use client";

import { useEffect, useRef, useState } from "react";

const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

export default function KakaoMap({ listings = [], hoveredId = null }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [mapStatus, setMapStatus] = useState("loading");

  useEffect(() => {
    if (typeof window === "undefined" || !KAKAO_MAP_KEY) return;

    const loadKakaoMap = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;
        
        // Default center (Seoul)
        const center = new window.kakao.maps.LatLng(37.5665, 126.9780);
        const map = new window.kakao.maps.Map(mapRef.current, {
          center,
          level: 7, // Zoomed out a bit to see the region
        });
        
        mapInstanceRef.current = map;
        setMapStatus("ready");
      });
    };

    if (window.kakao && window.kakao.maps) {
      loadKakaoMap();
    } else {
      const script = document.createElement("script");
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`;
      script.onload = loadKakaoMap;
      document.head.appendChild(script);
    }
  }, []);

  // Update markers when listings change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao?.maps?.services) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};

    const geocoder = new window.kakao.maps.services.Geocoder();
    const bounds = new window.kakao.maps.LatLngBounds();
    let boundsExtended = false;

    listings.forEach((listing) => {
      // We need coordinates. If your DB doesn't have lat/lng, we use Kakao's geocoder on the address/region
      const address = `${listing.region_name} ${listing.apt_name}`;
      
      geocoder.addressSearch(address, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          
          // Create marker
          const isSuper = listing.grade === "초급매";
          const markerColor = isSuper ? '#DC2626' : '#F97316'; // Red or Orange
          
          const content = `
            <div class="px-2 py-1 bg-white rounded-lg shadow-md border-2 ${isSuper ? 'border-red-600' : 'border-orange-500'} text-xs font-bold text-gray-900 whitespace-nowrap">
              <span class="${isSuper ? 'text-red-600' : 'text-orange-500'}">-${listing.discount_rate}%</span> ${Math.floor(listing.price/10000)}억
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
          
          // Auto-fit map to show all markers
          if (boundsExtended) {
            map.setBounds(bounds);
          }
        }
      });
    });
  }, [listings, mapStatus]);

  // Handle Hover State
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Reset all z-indexes
    Object.values(markersRef.current).forEach(m => m.overlay.setZIndex(1));

    // Elevate and pan to hovered marker
    if (hoveredId && markersRef.current[hoveredId]) {
      const target = markersRef.current[hoveredId];
      target.overlay.setZIndex(50);
      map.panTo(target.coords);
    }
  }, [hoveredId]);

  return (
    <div className="w-full h-full relative bg-gray-100">
      {mapStatus === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <span className="text-gray-400 font-bold animate-pulse">지도 위성 연결 중...</span>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}