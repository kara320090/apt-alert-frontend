"use client";

import { useState } from "react";

export default function EmailForm() {
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("전체");
  const [minDiscount, setMinDiscount] = useState(15);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !email.includes("@")) {
      setStatus("error");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, region, minDiscount }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mt-8">
      <h2 className="text-sm font-semibold text-blue-900 mb-1">
        급매물 알림 구독
      </h2>
      <p className="text-xs text-blue-500 mb-4">
        조건에 맞는 급매물이 나오면 이메일로 즉시 알려드려요
      </p>

      {/* 이메일 입력 */}
      <div className="mb-3">
        <label className="block text-xs text-blue-700 mb-1">이메일</label>
        <input
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* 지역 선택 */}
      <div className="mb-3">
        <label className="block text-xs text-blue-700 mb-1">알림 받을 지역</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {["전체", "강남구", "서초구", "마포구", "송파구", "노원구"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* 최소 할인율 */}
      <div className="mb-4">
        <label className="block text-xs text-blue-700 mb-1">
          최소 할인율{" "}
          <span className="font-semibold text-blue-900">{minDiscount}% 이상</span>
        </label>
        <input
          type="range"
          min={5}
          max={40}
          step={1}
          value={minDiscount}
          onChange={(e) => setMinDiscount(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 구독 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2 rounded-lg transition"
      >
        {loading ? "처리 중..." : "알림 구독하기"}
      </button>

      {/* 상태 메시지 */}
      {status === "success" && (
        <p className="text-xs text-green-600 text-center mt-3">
          구독 완료! 이메일을 확인해보세요.
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-500 text-center mt-3">
          올바른 이메일 주소를 입력해주세요.
        </p>
      )}
    </div>
  );
}