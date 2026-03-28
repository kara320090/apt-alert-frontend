"use client";

import { useEffect, useState } from "react";
import { subscribeAlert } from "../lib/api";

export default function EmailForm({
  regions = ["전체"],
  initialRegion = "전체",
  initialMinDiscount = 15,
}) {
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState(initialRegion || "전체");
  const [minDiscount, setMinDiscount] = useState(
    typeof initialMinDiscount === "number" ? initialMinDiscount : 15
  );
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRegion(initialRegion || "전체");
  }, [initialRegion]);

  useEffect(() => {
    if (typeof initialMinDiscount === "number") {
      setMinDiscount(initialMinDiscount);
    }
  }, [initialMinDiscount]);

  async function handleSubmit() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setStatus("error");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await subscribeAlert({
        email: trimmedEmail,
        region,
        minDiscount,
      });

      setStatus("success");
      setEmail("");
    } catch (err) {
      console.error(err);
      setStatus("error_api");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mt-8">
      <h2 className="text-sm font-semibold text-blue-900 mb-1">급매물 알림 구독</h2>
      <p className="text-xs text-blue-500 mb-4">
        조건에 맞는 급매물이 나오면 저장된 조건으로 알림을 보낼 수 있게 등록합니다.
      </p>

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

      <div className="mb-3">
        <label className="block text-xs text-blue-700 mb-1">알림 받을 지역</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-blue-700 mb-1">
          최소 할인율 <span className="font-semibold text-blue-900">{minDiscount}% 이상</span>
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

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2 rounded-lg transition"
      >
        {loading ? "처리 중..." : "알림 구독하기"}
      </button>

      {status === "success" && (
        <p className="text-xs text-green-600 text-center mt-3">
          구독 조건 저장 완료!
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-500 text-center mt-3">
          올바른 이메일 주소를 입력해주세요.
        </p>
      )}
      {status === "error_api" && (
        <p className="text-xs text-red-500 text-center mt-3">
          구독 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}
    </div>
  );
}