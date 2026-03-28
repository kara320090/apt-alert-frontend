"use client";

import { useEffect, useState } from "react";
import { grades as fallbackGrades } from "../data/dummy";

export default function FilterBar({
  onFilter,
  regions = ["전체"],
  initialValue = {
    region: "전체",
    grade: "전체",
    minDiscount: 5,
    aiEnabled: false,
    perPage: 20,
  },
}) {
  const [region, setRegion] = useState(initialValue.region || "전체");
  const [grade, setGrade] = useState(initialValue.grade || "전체");
  const [minDiscount, setMinDiscount] = useState(
    typeof initialValue.minDiscount === "number" ? initialValue.minDiscount : 5
  );
  const [aiEnabled, setAiEnabled] = useState(Boolean(initialValue.aiEnabled));
  const [perPage, setPerPage] = useState(
    typeof initialValue.perPage === "number" ? initialValue.perPage : 20
  );

  useEffect(() => {
    setRegion(initialValue.region || "전체");
    setGrade(initialValue.grade || "전체");
    setMinDiscount(typeof initialValue.minDiscount === "number" ? initialValue.minDiscount : 5);
    setAiEnabled(Boolean(initialValue.aiEnabled));
    setPerPage(typeof initialValue.perPage === "number" ? initialValue.perPage : 20);
  }, [initialValue]);

  function handleApply() {
    onFilter({
      region,
      grade,
      minDiscount,
      aiEnabled,
      perPage,
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">급매물 검색 조건</h2>
          <p className="text-xs text-gray-400 mt-1">
            AI 해석은 선택적으로 켜고 끌 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAiEnabled((prev) => !prev)}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
            aiEnabled ? "bg-blue-600" : "bg-gray-300"
          }`}
          aria-pressed={aiEnabled}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
              aiEnabled ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            aiEnabled
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-gray-100 text-gray-500 border border-gray-200"
          }`}
        >
          AI 해석 {aiEnabled ? "ON" : "OFF"}
        </span>

        <span className="text-xs text-gray-400">
          {aiEnabled
            ? "가격 + 역세권/학교/병원/생활편의 태그를 표시합니다"
            : "기본 필터만 사용합니다"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">지역</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">급매 등급</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            {fallbackGrades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            최소 할인율
            <span className="ml-2 text-blue-600 font-semibold">{minDiscount}% 이상</span>
          </label>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={minDiscount}
            onChange={(e) => setMinDiscount(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>0%</span>
            <span>20%</span>
            <span>40%</span>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">페이지당 매물 수</label>
        <select
          className="w-full md:w-56 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={perPage}
          onChange={(e) => setPerPage(Number(e.target.value))}
        >
          {[20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}개
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleApply}
        className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold py-3 rounded-xl transition-all"
      >
        급매물 검색
      </button>
    </div>
  );
}