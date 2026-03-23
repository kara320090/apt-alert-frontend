"use client";

export default function TopTabs({ activeTab, onChange }) {
  const tabs = [
    { key: "list", label: "급매물 목록" },
    { key: "report", label: "지역 리포트" },
  ];

  return (
    <div className="mb-6">
      <div className="inline-flex bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm font-semibold"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}