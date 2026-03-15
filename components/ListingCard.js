export default function ListingCard({ listing }) {
  const gradeColor = {
    초급매: "bg-red-100 text-red-700",
    급매: "bg-orange-100 text-orange-700",
    저평가: "bg-green-100 text-green-700",
    일반: "bg-gray-100 text-gray-500",
  };

  function formatPrice(price) {
    const uk = Math.floor(price / 10000);
    const man = price % 10000;
    if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}만`;
    if (uk > 0) return `${uk}억`;
    return `${price.toLocaleString()}만`;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition">

      {/* 상단: 단지명 + 등급 배지 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{listing.apt_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {listing.region_name} · {listing.area_size}㎡ · {listing.floor}층
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${gradeColor[listing.grade]}`}>
          {listing.grade}
        </span>
      </div>

      {/* 가격 정보 */}
      <div className="flex items-end justify-between mt-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">실거래가</p>
          <p className="text-lg font-bold text-gray-900">{formatPrice(listing.price)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-0.5">시세 평균</p>
          <p className="text-sm text-gray-500">{formatPrice(listing.market_avg)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-0.5">할인율</p>
          <p className="text-lg font-bold text-red-500">−{listing.discount_rate}%</p>
        </div>
      </div>

      {/* 하단: 거래일 */}
      <p className="text-xs text-gray-300 mt-3">
        {listing.deal_year}년 {listing.deal_month}월 거래
      </p>

    </div>
  );
}  
