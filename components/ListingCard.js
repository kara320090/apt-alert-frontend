"use client";

export default function ListingCard({ listing, isSelected }) {
  const isSuper = listing.grade === "초급매";

  function formatPrice(price) {
    const uk = Math.floor(Number(price || 0) / 10000);
    const man = Number(price || 0) % 10000;
    if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}만`;
    if (uk > 0) return `${uk}억`;
    return `${Number(price || 0).toLocaleString()}만`;
  }

  const discountAmount = Math.max(0, Number(listing.market_avg || 0) - Number(listing.price || 0));
  const discountRateRaw = Number.isFinite(Number(listing.discount_rate))
    ? Number(listing.discount_rate)
    : 0;
  const discountRate = Math.max(0, discountRateRaw);
  const dealDateLabel = listing.deal_date || "거래일 미상";
  const tradeTypeLabel = listing.transaction_type || "거래유형 미상";
  const tags = Array.isArray(listing.ai_tags) ? listing.ai_tags : [];
  const risk = listing.risk || null;
  const riskSignals = Array.isArray(risk?.signals) ? risk.signals : [];
  const trend = listing.price_trend || null;

  const riskColors = {
    위험: "bg-red-50 text-red-600 border-red-200",
    주의: "bg-yellow-50 text-yellow-600 border-yellow-200",
  };
  const trendColors = {
    상승: "text-red-500",
    하락: "text-blue-500",
    보합: "text-slate-400",
  };
  const trendArrows = { 상승: "↑", 하락: "↓", 보합: "→" };

  return (
    <div className={`relative bg-white rounded-2xl border p-6 transition-all duration-300 group mb-4 cursor-pointer ${
      isSelected
        ? "border-red-500 shadow-[0_8px_30px_-4px_rgba(220,38,38,0.15)] ring-2 ring-red-500/10"
        : "border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-slate-300"
    }`}>
      
      {/* 1. Header: Asset & Urgency */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1.5 w-2/3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded tracking-widest text-white shadow-sm ${isSuper ? "bg-red-600" : "bg-orange-500"}`}>
              {listing.grade}
            </span>
            {risk && risk.level !== "낮음" && (
              <span className={`text-[10px] font-black px-2 py-1 rounded border ${riskColors[risk.level]}`}>
                ⚠ {risk.level}
              </span>
            )}
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
            -{discountRate}%
          </p>
        </div>
      </div>

      {/* 2. Price Anchor */}
      <div className="flex justify-end items-end pb-4 mb-4 border-b border-gray-100">
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">최근 실거래가</p>
          <p className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {formatPrice(listing.price)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-gray-500">
            {dealDateLabel} · {tradeTypeLabel}
          </p>
          <p className="text-[11px] font-medium text-gray-400">
            비교 기준 {listing.market_avg_count || 0}건 · 최근 12개월 동일면적 평균
          </p>
        </div>
      </div>

      {/* 3. Price Trend */}
      {trend && (
        <div className="flex items-center justify-between mb-4 px-1">
          <span className={`text-xs font-black ${trendColors[trend.direction]}`}>
            {trendArrows[trend.direction]} 시세 {trend.direction} ({Math.abs(trend.trend_rate)}%/월)
          </span>
          <span className="text-[11px] text-slate-400">
            3개월 후 예상 <span className="font-bold text-slate-600">{formatPrice(trend.forecast_3m)}</span>
          </span>
        </div>
      )}

      {/* 4. AI Intel Box — 태그 또는 요약이 있을 때만 표시 */}
      {(tags.length > 0 || listing.ai_summary) && (
        <div className="bg-[#f8faff] rounded-xl p-4 border border-blue-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider">AI 해석</span>
          </div>
          {listing.ai_summary && (
            <p className="text-[13px] font-medium text-slate-700 leading-relaxed mb-3">
              {listing.ai_summary}
            </p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, idx) => (
                <span key={idx} className="text-[11px] font-bold text-blue-600 bg-white border border-blue-100 px-2.5 py-1 rounded-md shadow-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Risk Signals (주의/위험만 표시) */}
      {risk && risk.level !== "낮음" && riskSignals.length > 0 && (
        <div className={`mt-3 rounded-xl px-3 py-2 border ${risk.level === "위험" ? "bg-red-50 border-red-100" : "bg-yellow-50 border-yellow-100"}`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.14em] mb-1.5 ${risk.level === "위험" ? "text-red-600" : "text-yellow-600"}`}>
            ⚠ 위험 신호 (패턴 기반 경고)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {riskSignals.map((signal) => (
              <span key={signal} className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${risk.level === "위험" ? "bg-white text-red-600 border-red-200" : "bg-white text-yellow-600 border-yellow-200"}`}>
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}