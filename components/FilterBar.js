"use client";

import { useState } from "react";
import { REGION_FALLBACK } from "../lib/constants/regions";

const URGENCY_GRADES = ["전체", "초급매", "급매", "저평가"];

export default function FilterBar({ value, onSubmit, regions = REGION_FALLBACK }) {
  const [draft, setDraft] = useState(value || {
    region: "전체",
    grade: "전체",
    minDiscount: 10,
    aiEnabled: false,
  });


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
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight">검색 조건</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            이전에 만든 백엔드의 <span className="font-black text-red-500">/filter</span>, <span className="font-black text-red-500">/regions</span> 에 맞춰 동작합니다.
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

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span
          className={`text-[11px] font-black px-3 py-1.5 rounded-full border ${
            draft.aiEnabled
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-gray-50 text-gray-500 border-gray-200"
          }`}
        >
          AI {draft.aiEnabled ? "ON" : "OFF"}
        </span>
        <span className="text-xs font-bold text-gray-400">
          ON일 때는 카카오 로컬 기반 입지 태그를 함께 표시합니다.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">지역</label>
          <select
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-100"
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
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">급매 등급</label>
          <select
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-100"
            value={draft.grade}
            onChange={(e) => updateField("grade", e.target.value)}
          >
            {URGENCY_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
            최소 할인율 <span className="text-red-500">{draft.minDiscount}% 이상</span>
          </label>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={draft.minDiscount}
            onChange={(e) => updateField("minDiscount", Number(e.target.value))}
            className="w-full accent-red-500"
          />
          <div className="mt-1 flex justify-between text-[11px] font-bold text-gray-300">
            <span>0%</span>
            <span>20%</span>
            <span>40%</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleApply}
        className="w-full bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-black tracking-wide py-3 rounded-xl transition-all shadow-[0_8px_24px_-8px_rgba(220,38,38,0.45)]"
      >
        급매물 다시 검색
      </button>
    </div>
  );
}
