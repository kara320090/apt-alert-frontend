"use client";

import { useState } from "react";
import KakaoMap from "./KakaoMap";

export default function ListingCard({ listing }) {
  const [open, setOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const gradeStyle = {
    초급매: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    급매:   { bg: "bg-orange-50", text: "text-orange-500", border: "border-orange-200" },
    저평가: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
    일반:   { bg: "bg-gray-50", text: "text-gray-400", border: "border-gray-200" },
  };

  const style = gradeStyle[listing.grade] || gradeStyle["일반"];

  function formatPrice(price) {
    const uk = Math.floor(price / 10000);
    const man = price % 10000;
    if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}만`;
    if (uk > 0) return `${uk}억`;
    return `${price.toLocaleString()}만`;
  }

  return (
    <>
      <div className={`bg-white rounded-2xl border ${style.border} shadow-sm mb-3 overflow-hidden transition-all`}>

        {/* 요약 행 */}
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => setOpen(!open)}
        >
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
              {listing.grade}
            </span>
            <span className="text-sm font-semibold text-gray-900">{listing.apt_name}</span>
            <span className="text-xs text-gray-400 hidden md:inline">
              {listing.region_name} · {listing.area_size}㎡
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${style.text}`}>−{listing.discount_rate}%</span>
            <span className="text-sm font-semibold text-gray-800">{formatPrice(listing.price)}</span>
            <span className="text-gray-300 text-sm">{open ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* 상세 정보 */}
        {open && (
          <div className="px-5 pb-5 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">실거래가</p>
                <p className="text-lg font-bold text-gray-900">{formatPrice(listing.price)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">시세 평균</p>
                <p className="text-lg font-bold text-gray-500">{formatPrice(listing.market_avg)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">할인율</p>
                <p className={`text-lg font-bold ${style.text}`}>−{listing.discount_rate}%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">위치</p>
                <p className="text-sm font-semibold text-gray-700">
                  {listing.region_name} · {listing.floor}층
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <p className="text-xs text-gray-300">
                {listing.deal_year}년 {listing.deal_month}월 거래
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMap(true);
                }}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium transition"
              >
                지도에서 보기 →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 카카오 지도 모달 */}
      {showMap && (
        <KakaoMap
          listing={listing}
          onClose={() => setShowMap(false)}
        />
      )}
    </>
  );
}