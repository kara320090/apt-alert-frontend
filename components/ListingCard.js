"use client";

export default function ListingCard({ listing }) {
  const isSuper = listing.grade === "초급매";

  function formatPrice(price) {
    const uk = Math.floor(Number(price || 0) / 10000);
    const man = Number(price || 0) % 10000;
    if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}`;
    if (uk > 0) return `${uk}억`;
    return `${Number(price || 0).toLocaleString()}만`;
  }

  const discountAmount = listing.market_avg - listing.price;
  const tags = Array.isArray(listing.ai_tags) && listing.ai_tags.length > 0 
    ? listing.ai_tags 
    : ["강한 가격 메리트", "시세 대비 큰 할인", "역세권", "생활편의 양호"];

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-slate-300 transition-all duration-400 group mb-4">
      
      {/* 1. Header: Asset & Urgency */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1.5 w-2/3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded tracking-widest text-white shadow-sm ${isSuper ? "bg-red-600" : "bg-orange-500"}`}>
              {listing.grade}
            </span>
            <span className="text-xs font-bold text-gray-400">
              시세 대비 <span className={isSuper ? "text-red-600" : "text-orange-500"}>{formatPrice(discountAmount)}</span> 저렴
            </span>
          </div>
          <h3 className="text-lg font-black text-gray-900 tracking-tight mt-1 group-hover:text-red-600 transition-colors truncate">
            {listing.apt_name || "단지명 미상"}
          </h3>
          <p className="text-xs font-medium text-gray-500 truncate">
            {listing.region_name} · {listing.area_size}㎡
          </p>
        </div>

        {/* Scaled down discount percentage */}
        <div className="text-right flex flex-col items-end w-1/3">
           <p className={`text-3xl font-black tracking-tighter ${isSuper ? "text-red-600" : "text-orange-500"}`}>
            -{listing.discount_rate}%
          </p>
        </div>
      </div>

      {/* 2. Price Anchor */}
      <div className="flex justify-end items-end pb-4 mb-4 border-b border-gray-100">
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">최종 급매가</p>
          {/* Scaled down final price */}
          <p className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {formatPrice(listing.price)}
          </p>
        </div>
      </div>

      {/* 3. Premium AI Intel Box */}
      <div className="bg-[#f8faff] rounded-xl p-4 border border-blue-50/50">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider">AI 해석</span>
        </div>
        <p className="text-[13px] font-medium text-slate-700 leading-relaxed mb-3">
          {listing.ai_summary || `AI가 시세 대비 하락폭을 분석했습니다. 현재 진입하기 좋은 가격대입니다.`}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, idx) => (
            <span key={idx} className="text-[11px] font-bold text-blue-600 bg-white border border-blue-100 px-2.5 py-1 rounded-md shadow-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}