export default function ListingCard({ listing }) {
  const gradeStyle = {
    초급매: { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
    급매:   { bg: "bg-orange-50", text: "text-orange-500", border: "border-orange-100" },
    저평가: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    일반:   { bg: "bg-gray-50", text: "text-gray-400", border: "border-gray-100" },
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
    <div className={`bg-white rounded-2xl border ${style.border} shadow-sm hover:shadow-md transition-shadow p-5`}>

      {/* 상단 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-gray-900 text-base">{listing.apt_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {listing.region_name} · {listing.area_size}㎡ · {listing.floor}층
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${style.bg} ${style.text}`}>
          {listing.grade}
        </span>
      </div>

      {/* 구분선 */}
      <div className="border-t border-gray-50 mb-4"></div>

      {/* 가격 정보 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-400 mb-1">실거래가</p>
          <p className="text-sm font-bold text-gray-900">{formatPrice(listing.price)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">시세 평균</p>
          <p className="text-sm text-gray-500">{formatPrice(listing.market_avg)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">할인율</p>
          <p className={`text-sm font-bold ${style.text}`}>−{listing.discount_rate}%</p>
        </div>
      </div>

      {/* 하단 */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
        <p className="text-xs text-gray-300">
          {listing.deal_year}년 {listing.deal_month}월 거래
        </p>
        <span className="text-xs text-blue-400 cursor-pointer hover:text-blue-600">
          지도에서 보기 →
        </span>
      </div>

    </div>
  );
}