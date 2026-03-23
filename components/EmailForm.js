"use client";

import { useState } from "react";

export default function EmailForm({ filterParams = {} }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

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
          region: filterParams.region || "전체",
          grade: filterParams.grade || "전체",
          min_discount: filterParams.minDiscount || 10,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setEmail("");
    } catch {
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
          <h2 className="text-lg font-black text-white tracking-tight">조건 맞는 초급매, 놓치지 마세요</h2>
        </div>
        <p className="text-sm text-gray-400 font-medium mb-6 leading-relaxed">
          설정하신 필터에 맞는 매물이 등록되면 <span className="text-red-400 font-bold">1분 안에 이메일로 즉시</span> 알려드립니다.
        </p>

        {status === "success" ? (
          <div className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-4 py-3 rounded-lg inline-flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            레이더 등록 완료! 첫 급매물을 기대해주세요.
          </div>
        ) : (
          <>
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
                {loading ? "..." : "무료 알림 받기"}
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
