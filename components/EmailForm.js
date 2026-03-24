"use client";

import { useMemo, useState } from "react";

export default function EmailForm({ filterParams = {}, regions = [] }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState(filterParams.region || "전체");
  const [grade, setGrade] = useState(filterParams.grade || "전체");
  const [minDiscount, setMinDiscount] = useState(Number(filterParams.minDiscount || 10));

  const availableRegions = useMemo(() => {
    return Array.isArray(regions) && regions.length > 0 ? regions : ["전체"];
  }, [regions]);

  async function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setStatus("invalid");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          region,
          grade,
          min_discount: minDiscount,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "구독 처리 중 오류가 발생했어요.");
      }

      setStatus("success");
      setEmail("");
    } catch (error) {
      console.error(error);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden group my-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl group-hover:bg-red-600/20 transition-colors pointer-events-none -mr-20 -mt-20"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">⏱️</span>
          <h2 className="text-lg font-black text-white tracking-tight">조건 맞는 급매물, 놓치지 마세요</h2>
        </div>
        <p className="text-sm text-gray-400 font-medium mb-6 leading-relaxed">
          이전에 만든 백엔드의 <span className="text-red-400 font-bold">/subscribe</span> 와 직접 연결됩니다.
        </p>

        {status === "success" ? (
          <div className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-4 py-3 rounded-lg inline-flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            구독 조건 저장 완료! 같은 조건이 있으면 중복 저장하지 않습니다.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 focus:bg-gray-800 transition-all"
              >
                {availableRegions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 focus:bg-gray-800 transition-all"
              >
                {["전체", "초급매", "급매", "저평가"].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                최소 할인율 <span className="text-red-400">{minDiscount}% 이상</span>
              </label>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={minDiscount}
                onChange={(e) => setMinDiscount(Number(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="수신할 이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-red-500 focus:bg-gray-800 transition-all placeholder:text-gray-500"
              />
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 active:scale-95 text-white font-bold px-8 py-3.5 rounded-xl transition-all whitespace-nowrap shadow-[0_4px_14px_rgba(220,38,38,0.4)]"
              >
                {loading ? "저장 중..." : "무료 알림 받기"}
              </button>
            </div>

            {status === "invalid" && (
              <p className="mt-3 text-xs font-bold text-red-400">올바른 이메일을 입력해주세요.</p>
            )}
            {status === "error" && (
              <p className="mt-3 text-xs font-bold text-red-400">오류가 발생했어요. 다시 시도해주세요.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
