"use client";

import { useState, useEffect } from "react";
import { dummyListings } from "../data/dummy";
import { enrichListings, applyFilter } from "../lib/filter";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import EmailForm from "../components/EmailForm";

// A의 Render URL이 생기면 .env.local에 추가하면 자동 전환됨
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [allListings, setAllListings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 데이터 불러오기
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        let data;

        if (API_URL) {
          // A의 API 연동됐을 때 — 실제 데이터
          const res = await fetch(`${API_URL}/listings`);
          if (!res.ok) throw new Error("API 호출 실패");
          const raw = await res.json();
          data = enrichListings(raw);
        } else {
          // A 대기 중 — 더미 데이터
          await new Promise((r) => setTimeout(r, 500)); // 로딩 효과
          data = enrichListings(dummyListings);
        }

        setAllListings(data);
        setFiltered(data);
      } catch (err) {
        setError("데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // 필터 적용
  function handleFilter({ region, grade, maxDiscount }) {
    const result = applyFilter(allListings, {
      region,
      grade,
      minDiscount: maxDiscount,
    });
    setFiltered(result);
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">급매물 알리미</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          실거래가 기반 급매물 자동 감지 서비스
        </p>
        {!API_URL && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mt-1 inline-block">
            더미 데이터 모드
          </span>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* 필터 */}
        <FilterBar onFilter={handleFilter} />

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">
            급매물 불러오는 중...
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="text-center py-16 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 결과 */}
        {!loading && !error && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {filtered.length}건의 급매물
            </p>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400 text-sm">
                조건에 맞는 급매물이 없습니다
              </div>
            )}
          </>
        )}

        {/* 알림 구독 */}
        <EmailForm />

      </div>
    </main>
  );
}
```

저장(`Ctrl+S`) 후 브라우저에서 확인해보세요.

노란색 **"더미 데이터 모드"** 배지가 헤더에 보이면 성공이에요. A의 Render URL이 생기면 `.env.local` 에 이 한 줄만 추가하면 자동으로 실제 데이터로 전환돼요.
```
NEXT_PUBLIC_API_URL=https://A가_알려준_URL