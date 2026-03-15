  "use client";

import { useState } from "react";
import { regions, grades } from "../data/dummy";

export default function FilterBar({ onFilter }) {
  const [region, setRegion] = useState("전체");
  const [grade, setGrade] = useState("전체");
  const [maxDiscount, setMaxDiscount] = useState(30);

  function handleApply() {
    onFilter({ region, grade, maxDiscount });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-500 mb-4">필터 조건</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* 지역 선택 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">지역</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
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
          <label className="block text-xs text-gray-500 mb-1">급매 등급</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            {grades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* 할인율 슬라이더 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            최소 할인율 <span className="font-semibold text-gray-700">{maxDiscount}% 이상</span>
          </label>
          <input
            type="range"
            min={5}
            max={40}
            step={1}
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(Number(e.target.value))}
            className="w-full"
          />
        </div>

      </div>

      <button
        onClick={handleApply}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition"
      >
        급매물 검색
      </button>
    </div>
  );
}
