"use client";

import { useEffect, useState } from "react";
import { GRADES } from "@/lib/constants/grades";

export default function FilterBar({ value, regions, onSubmit }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function updateField(key, nextValue) {
    setDraft((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
  }

  function handleApply() {
    onSubmit({
      ...draft,
      page: 1,
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
          onClick={() => updateField("aiEnabled", !draft.aiEnabled)}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
            draft.aiEnabled ? "bg-blue-600" : "bg-gray-300"
          }`}
          aria-pressed={draft.aiEnabled}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
              draft.aiEnabled ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            draft.aiEnabled
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-gray-100 text-gray-500 border border-gray-200"
          }`}
        >
          AI 해석 {draft.aiEnabled ? "ON" : "OFF"}
        </span>

        <span className="text-xs text-gray-400">
          {draft.aiEnabled
            ? "가격 + 역세권/학교/병원/생활편의 태그를 표시합니다"
            : "기본 필터만 사용합니다"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">지역</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={draft.region}
            onChange={(e) => updateField("region", e.target.value)}
          >
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">급매 등급</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={draft.grade}
            onChange={(e) => updateField("grade", e.target.value)}
          >
            {GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            최소 할인율
            <span className="ml-2 text-blue-600 font-semibold">{draft.minDiscount}% 이상</span>
          </label>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={draft.minDiscount}
            onChange={(e) => updateField("minDiscount", Number(e.target.value))}
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
