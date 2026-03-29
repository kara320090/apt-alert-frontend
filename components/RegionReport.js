"use client";

import { useMemo } from "react";

function formatPrice(value) {
  const price = Number(value || 0);
  if (!Number.isFinite(price) || price <= 0) return "-";

  const uk = Math.floor(price / 10000);
  const man = price % 10000;

  if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}만`;
  if (uk > 0) return `${uk}억`;
  return `${price.toLocaleString()}만`;
}

function formatPercent(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "-";
  return `${num.toFixed(1)}%`;
}

function average(values) {
  const valid = values.filter((v) => Number.isFinite(Number(v)));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, v) => sum + Number(v), 0) / valid.length;
}

function getMarketAvgCaption(item) {
  const count = Number(item?.market_avg_count || 0);
  const months = Number(item?.market_avg_period_months || 12);
  const method = String(item?.market_avg_method || "");

  if (count <= 0) return null;

  if (method === "same_apartment_last_12_months") {
    return `같은 아파트 최근 ${months}개월 ${count}건 평균`;
  }

  return `비교 시세 산정 기준 ${count}건`;
}

function buildRegionStats(regionName, items) {
  const totalCount = items.length;
  const superCount = items.filter((item) => item.grade === "초급매").length;
  const hotCount = items.filter((item) => item.grade === "급매").length;
  const avgDiscount = average(items.map((item) => item.discount_rate));
  const avgPrice = average(items.map((item) => item.price));
  const avgMarket = average(
    items
      .map((item) => item.market_avg)
      .filter((v) => Number(v) > 0)
  );

  const avgSavings = average(
    items
      .map((item) => Number(item.market_avg || 0) - Number(item.price || 0))
      .filter((v) => v > 0)
  );

  const withMarketAvg = items.filter((item) => Number(item.market_avg || 0) > 0);
  const avgMarketCount = average(
    withMarketAvg.map((item) => Number(item.market_avg_count || 0)).filter((v) => v > 0)
  );

  const topDeal = [...items]
    .filter((item) => Number(item.discount_rate || 0) > 0)
    .sort((a, b) => Number(b.discount_rate || 0) - Number(a.discount_rate || 0))[0];

  return {
    regionName,
    totalCount,
    superCount,
    hotCount,
    avgDiscount,
    avgPrice,
    avgMarket,
    avgSavings,
    avgMarketCount,
    topDeal,
  };
}

export default function RegionReport({
  listings = [],
  aiEnabled = false,
  regions = [],
  selectedRegion = "전체",
}) {
  const validListings = useMemo(
    () => listings.filter((item) => item && item.region_name),
    [listings]
  );

  const overview = useMemo(() => {
    const totalCount = validListings.length;
    const superCount = validListings.filter((item) => item.grade === "초급매").length;
    const hotCount = validListings.filter((item) => item.grade === "급매").length;
    const avgDiscount = average(validListings.map((item) => item.discount_rate));
    const avgPrice = average(validListings.map((item) => item.price));

    const marketAvgItems = validListings.filter((item) => Number(item.market_avg || 0) > 0);
    const avgMarket = average(marketAvgItems.map((item) => item.market_avg));
    const avgMarketCount = average(
      marketAvgItems.map((item) => Number(item.market_avg_count || 0)).filter((v) => v > 0)
    );

    const topDeal = [...validListings]
      .filter((item) => Number(item.discount_rate || 0) > 0)
      .sort((a, b) => Number(b.discount_rate || 0) - Number(a.discount_rate || 0))[0];

    return {
      totalCount,
      superCount,
      hotCount,
      avgDiscount,
      avgPrice,
      avgMarket,
      avgMarketCount,
      topDeal,
    };
  }, [validListings]);

  const regionStats = useMemo(() => {
    const grouped = new Map();

    validListings.forEach((item) => {
      const key = item.region_name || "기타";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    return Array.from(grouped.entries())
      .map(([regionName, items]) => buildRegionStats(regionName, items))
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [validListings]);

  const topAiTags = useMemo(() => {
    const counts = new Map();

    validListings.forEach((item) => {
      const tags = Array.isArray(item.ai_tags) ? item.ai_tags : [];
      tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [validListings]);

  if (validListings.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-2">지역 리포트</h3>
        <p className="text-sm font-medium text-slate-500">
          현재 조건에서 분석할 매물이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
              Region Report
            </p>
            <h3 className="text-xl font-black text-slate-900">
              {selectedRegion === "전체" ? "전체 지역 리포트" : `${selectedRegion} 리포트`}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              현재 화면 기준 매물 데이터를 바탕으로 요약한 결과입니다.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-right">
            <p className="text-[11px] font-black uppercase tracking-wider text-red-500">
              총 매물
            </p>
            <p className="text-2xl font-black text-red-600 mt-1">
              {overview.totalCount.toLocaleString()}건
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              평균 할인율
            </p>
            <p className="text-xl font-black text-slate-900 mt-2">
              {formatPercent(overview.avgDiscount)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              초급매 수
            </p>
            <p className="text-xl font-black text-red-600 mt-2">
              {overview.superCount.toLocaleString()}건
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              평균 매매가
            </p>
            <p className="text-xl font-black text-slate-900 mt-2">
              {formatPrice(overview.avgPrice)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              평균 비교 시세
            </p>
            <p className="text-xl font-black text-slate-900 mt-2">
              {overview.avgMarket > 0 ? formatPrice(overview.avgMarket) : "-"}
            </p>
            {overview.avgMarketCount > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                같은 아파트 최근 12개월 평균 거래 수 약 {overview.avgMarketCount.toFixed(1)}건
              </p>
            )}
          </div>
        </div>
      </div>

      {overview.topDeal && (
        <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-400 mb-2">
            Best Deal Snapshot
          </p>
          <h4 className="text-lg font-black text-slate-900">
            현재 가장 할인율이 큰 매물
          </h4>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
            <div className="rounded-2xl bg-white border border-red-100 px-5 py-4">
              <p className="text-lg font-black text-slate-900">
                {overview.topDeal.apt_name}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {overview.topDeal.region_name} · {overview.topDeal.area_size}㎡ · {overview.topDeal.floor}층
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex rounded-full bg-red-600 text-white px-3 py-1 text-xs font-black">
                  {overview.topDeal.grade}
                </span>
                <span className="inline-flex rounded-full bg-red-50 text-red-600 border border-red-100 px-3 py-1 text-xs font-black">
                  할인율 {formatPercent(overview.topDeal.discount_rate)}
                </span>
              </div>

              {overview.topDeal.ai_summary && (
                <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                  {overview.topDeal.ai_summary}
                </p>
              )}

              {Array.isArray(overview.topDeal.ai_tags) && overview.topDeal.ai_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {overview.topDeal.ai_tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded-full bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 text-[11px] font-bold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-red-100 px-5 py-4">
              <div className="mb-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  매매가
                </p>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {formatPrice(overview.topDeal.price)}
                </p>
              </div>

              <div className="mb-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  비교 시세
                </p>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {formatPrice(overview.topDeal.market_avg)}
                </p>
                {getMarketAvgCaption(overview.topDeal) && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {getMarketAvgCaption(overview.topDeal)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  절감액
                </p>
                <p className="text-xl font-black text-red-600 mt-1">
                  {formatPrice(
                    Number(overview.topDeal.market_avg || 0) - Number(overview.topDeal.price || 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
              Region Breakdown
            </p>
            <h4 className="text-lg font-black text-slate-900">지역별 분포</h4>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            총 {regionStats.length}개 지역
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {regionStats.map((stat) => (
            <div
              key={stat.regionName}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black text-slate-900">{stat.regionName}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    매물 {stat.totalCount}건 · 초급매 {stat.superCount}건 · 급매 {stat.hotCount}건
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    평균 할인율
                  </p>
                  <p className="text-lg font-black text-red-600 mt-1">
                    {formatPercent(stat.avgDiscount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="rounded-xl bg-white border border-slate-100 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    평균 매매가
                  </p>
                  <p className="text-sm font-black text-slate-900 mt-2">
                    {formatPrice(stat.avgPrice)}
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-slate-100 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    평균 비교 시세
                  </p>
                  <p className="text-sm font-black text-slate-900 mt-2">
                    {stat.avgMarket > 0 ? formatPrice(stat.avgMarket) : "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-slate-100 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    평균 절감액
                  </p>
                  <p className="text-sm font-black text-red-600 mt-2">
                    {stat.avgSavings > 0 ? formatPrice(stat.avgSavings) : "-"}
                  </p>
                </div>
              </div>

              {stat.avgMarketCount > 0 && (
                <p className="mt-3 text-[11px] text-slate-500">
                  같은 아파트 최근 12개월 평균 거래 수 약 {stat.avgMarketCount.toFixed(1)}건
                </p>
              )}

              {stat.topDeal && (
                <div className="mt-4 rounded-xl bg-white border border-slate-100 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    대표 급매
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{stat.topDeal.apt_name}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {stat.topDeal.area_size}㎡ · {stat.topDeal.floor}층
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-red-600">
                        {formatPercent(stat.topDeal.discount_rate)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {aiEnabled && topAiTags.length > 0 && (
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-400 mb-2">
            AI Insight
          </p>
          <h4 className="text-lg font-black text-slate-900 mb-4">자주 등장한 AI 태그</h4>

          <div className="flex flex-wrap gap-2">
            {topAiTags.map(([tag, count]) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-white text-blue-600 border border-blue-100 px-3 py-1.5 text-xs font-black shadow-sm"
              >
                {tag} · {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}