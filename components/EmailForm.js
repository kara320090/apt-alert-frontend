"use client";

import { useEffect, useMemo, useState } from "react";

export default function EmailForm({
  regions = [],
  initialRegion = "전체",
  initialMinDiscount = 10,
}) {
  const normalizedRegions = useMemo(() => {
    const list = Array.isArray(regions) ? regions.filter(Boolean) : [];
    if (list.includes("전체")) return list;
    return ["전체", ...list];
  }, [regions]);

  const [email, setEmail] = useState("");
  const [region, setRegion] = useState(initialRegion || "전체");
  const [minDiscount, setMinDiscount] = useState(
    Number.isFinite(Number(initialMinDiscount)) ? Number(initialMinDiscount) : 10
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("idle");

  useEffect(() => {
    setRegion(initialRegion || "전체");
  }, [initialRegion]);

  useEffect(() => {
    setMinDiscount(
      Number.isFinite(Number(initialMinDiscount)) ? Number(initialMinDiscount) : 10
    );
  }, [initialMinDiscount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessageType("error");
      setMessage("이메일을 입력해주세요.");
      return;
    }

    const payload = {
      email: trimmedEmail,
      region: region || "전체",
      min_discount: Number(minDiscount) || 0,
    };

    try {
      setLoading(true);
      setMessage("");
      setMessageType("idle");

      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "구독 등록에 실패했습니다.");
      }

      setMessageType("success");
      setMessage(data?.message || "구독이 등록되었습니다.");
      setEmail("");
    } catch (err) {
      setMessageType("error");
      setMessage(err?.message || "구독 등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-black text-slate-900">이메일 구독</h3>
        <p className="mt-1 text-xs font-medium text-slate-500">
          원하는 지역과 할인율 조건으로 급매 알림을 받아보세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-black text-slate-600 mb-1.5">
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 mb-1.5">
            지역
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            disabled={loading}
          >
            {normalizedRegions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 mb-1.5">
            최소 할인율 (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={minDiscount}
            onChange={(e) => setMinDiscount(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "등록 중..." : "이메일 구독하기"}
        </button>

        {message ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-bold ${
              messageType === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        ) : null}
      </form>
    </div>
  );
}