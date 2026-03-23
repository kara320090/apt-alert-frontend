"use client";

import { useState } from "react";

const URGENGY_GRADES = ["전체", "초급매", "급매", "저평가"];
const REGIONS = ["전체", "강남구", "서초구", "송파구", "마포구", "용산구", "성동구", "노원구"];

export default function FilterBar({ onFilter }) {
  const [region, setRegion] = useState("전체");
  const [grade, setGrade] = useState("전체");
  const [maxDiscount, setMaxDiscount] = useState(10);

  function handleApply() {
    onFilter({ region, grade, maxDiscount });
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Region */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">타겟 지역</label>
          <select
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 12px center`, backgroundRepeat: `no-repeat`, backgroundSize: `16px` }}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Grade */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">급매 타격점</label>
          <select
             className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer appearance-none"
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 12px center`, backgroundRepeat: `no-repeat`, backgroundSize: `16px` }}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            {URGENGY_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Slider */}
        <div className="flex flex-col justify-center mt-1">
          <label className="flex justify-between items-center text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            최소 하락폭 <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md">{maxDiscount}% 이상</span>
          </label>
          
          <input
            type="range" 
            min={5} 
            max={40} 
            step={1}
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(Number(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-red-600 outline-none"
            style={{
              // Dynamically calculate the fill percentage
              background: `linear-gradient(to right, #dc2626 ${((maxDiscount - 5) / (40 - 5)) * 100}%, #e5e7eb ${((maxDiscount - 5) / (40 - 5)) * 100}%)`
            }}
          />
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
        <p className="text-[11px] font-bold text-gray-400 tracking-wider hidden md:flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
           AI 레이더 실시간 가동 중
        </p>
        <button
          onClick={handleApply}
          className="w-full md:w-auto bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-black px-8 py-3 rounded-xl transition-all shadow-[0_4px_12px_rgba(220,38,38,0.3)]"
        >
          레이더 스캔
        </button>
      </div>
    </div>
  );
}