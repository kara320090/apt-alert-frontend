"use client";

import { useState } from "react";
import { regions, grades } from "../data/dummy";

export default function FilterBar({ onFilter }) {
  const [region, setRegion] = useState("전체");
  const [grade, setGrade] = useState("전체");
  const [maxDiscount, setMaxDiscount] = useState(5);

  function handleApply() {
    onFilter({ region, grade, maxDiscount });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">급매물 검색 조건</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

        {/* 지역 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">지역</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* 급매 등급 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">급매 등급</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            {grades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* 할인율 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            최소 할인율
            <span className="ml-2 text-blue-600 font-semibold">{maxDiscount}% 이상</span>
          </label>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>0%</span>
            <span>20%</span>
            <span>40%</span>
          </div>
        </div>

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