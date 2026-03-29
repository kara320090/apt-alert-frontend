"use client";

export default function TopTabs({ activeTab, onChange }) {
  return (
    <div className="flex bg-slate-200/60 p-1.5 rounded-xl mb-6 border border-slate-200 shadow-inner">
      <button
        onClick={() => onChange("list")}
        className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
          activeTab === "list"
            ? "bg-white text-red-600 shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
        }`}
      >
        실시간 레이더
      </button>
      <button
        onClick={() => onChange("report")}
        className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
          activeTab === "report"
            ? "bg-white text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
        }`}
      >
        지역 지표 분석
      </button>
    </div>
  );
}