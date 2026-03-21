"use client";

import { useEffect, useRef } from "react";

export default function KakaoMap({ listing, onClose }) {
  const mapRef = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = mapRef.current;
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 5,
        };
        const map = new window.kakao.maps.Map(container, options);

        // 주소로 좌표 검색
        const geocoder = new window.kakao.maps.services.Geocoder();
        const address = `${listing.region_name} ${listing.apt_name}`;

        geocoder.addressSearch(address, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
            map.setCenter(coords);

            // 마커 추가
            const marker = new window.kakao.maps.Marker({
              map,
              position: coords,
            });

            // 인포윈도우
            const infowindow = new window.kakao.maps.InfoWindow({
              content: `
                <div style="padding:8px 12px;font-size:12px;min-width:160px;">
                  <strong>${listing.apt_name}</strong><br/>
                  <span style="color:#dc2626;">−${listing.discount_rate}%</span>
                  &nbsp;·&nbsp;
                  <span>${listing.region_name}</span>
                </div>
              `,
            });
            infowindow.open(map, marker);
          }
        });
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [listing]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">{listing.apt_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{listing.region_name} · {listing.area_size}㎡ · {listing.floor}층</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light"
          >
            ✕
          </button>
        </div>
        <div ref={mapRef} style={{ width: "100%", height: "400px" }} />
      </div>
    </div>
  );
}