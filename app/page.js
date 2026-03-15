

"use client";

import EmailForm from "../components/EmailForm";
import { useState } from "react";
import { dummyListings } from "../data/dummy";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";

export default function Home() {
  const [listings, setListings] = useState(dummyListings);

  function handleFilter({ region, grade, maxDiscount }) {
    const filtered = dummyListings.filter((item) => {
      const regionMatch = region === "전체" || item.region_name === region;
      const gradeMatch = grade === "전체" || item.grade === grade;
      const discountMatch = item.discount_rate >= maxDiscount;
      return regionMatch && gradeMatch && discountMatch;
    });
    setListings(filtered);
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">급매물 알리미</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          실거래가 기반 급매물 자동 감지 서비스
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* 필터 */}
        <FilterBar onFilter={handleFilter} />

        {/* 결과 수 */}
        <p className="text-sm text-gray-500 mb-4">
          {listings.length}건의 급매물
        </p>

        {/* 매물 목록 */}
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-sm">
            조건에 맞는 급매물이 없습니다
          </div>
        )}
        {/* 알림 구독 */}
        <EmailForm />

      </div>
    </main>
  );
}