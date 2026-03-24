"use client";

import { useMemo, useState, useEffect } from "react";
import { buildRegionAiSummary, buildRegionReport } from "../lib/report";

export default function RegionReport({
  listings,
  aiEnabled,
  regions = ["전체"],
  selectedRegion: externalSelectedRegion = "전체",
}) {
  const [selectedRegion, setSelectedRegion] = useState(externalSelectedRegion);

  useEffect(() => {
    setSelectedRegion(externalSelectedRegion || "전체");
  }, [externalSelectedRegion]);

  const report = useMemo(() => {
    return buildRegionReport(listings, selectedRegion);
  }, [listings, selectedRegion]);

  const aiSummary = useMemo(() => {
    return aiEnabled ? buildRegionAiSummary(report) : "";
  }, [report, aiEnabled]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <label className="block text-xs font-medium text-gray-500 mb-2">지역 선택</label>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="w-full md:w-72 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50"
        >
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">급매물 수</p>
          <p className="text-xl font-bold text-gray-900">{report.totalCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">평균 할인율</p>
          <p className="text-xl font-bold text-blue-600">{report.avgDiscount}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">초급매 비중</p>
          <p className="text-xl font-bold text-red-500">{report.urgentRatio}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">평균 면적</p>
          <p className="text-xl font-bold text-gray-900">{report.avgArea}㎡</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">평균 층수</p>
          <p className="text-xl font-bold text-gray-900">{report.avgFloor}층</p>
        </div>
      </div>

      {aiEnabled && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-blue-700 mb-2">AI 지역 해석</p>
          <p className="text-sm text-blue-900 leading-6">{aiSummary}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 mb-4">월별 변화</p>

        <div className="space-y-3">
          {report.monthlyTrend.length > 0 ? (
            report.monthlyTrend.map((row) => (
              <div
                key={row.month}
                className="flex flex-col md:flex-row md:items-center md:justify-between rounded-xl bg-gray-50 px-4 py-3"
              >
                <div className="text-sm font-semibold text-gray-800">{row.month}</div>
                <div className="text-xs text-gray-500 mt-1 md:mt-0">
                  급매물 {row.count}건 · 평균 할인율 {row.avgDiscount}% · 초급매 비중{" "}
                  {row.superUrgentRatio}%
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-400">분석할 월별 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}