"use client";

import { useState, useEffect } from "react";
import { dummyListings } from "../data/dummy";
import { enrichListings, applyFilter } from "../lib/filter";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import EmailForm from "../components/EmailForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [allListings, setAllListings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        let data;
        if (API_URL) {
          const res = await fetch(`${API_URL}/listings`);
          if (!res.ok) throw new Error("API 호출 실패");
          const json = await res.json();
          const raw = json.data.map((item) => ({
            id: item.id,
            apt_seq: item.properties.apt_seq,
            apt_name: item.properties.apt_name,
            area_size: item.properties.area_size,
            region_code: item.properties.region_code,
            region_name: item.properties.dong,
            price: item.price,
            floor: item.floor,
            deal_year: parseInt(item.deal_date.split("-")[0]),
            deal_month: parseInt(item.deal_date.split("-")[1]),
            cdeal_type: item.is_cancelled ? "Y" : "",
          }));
          data = enrichListings(raw);
        } else {
          await new Promise((r) => setTimeout(r, 500));
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

  function handleFilter({ region, grade, maxDiscount }) {
    const result = applyFilter(allListings, {
      region,
      grade,
      minDiscount: maxDiscount,
    });
    setFiltered(result);
    setPage(1);
  }

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <main className="min-h-screen bg-gray-50">

      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">급매물 알리미</h1>
            <p className="text-xs text-gray-400 mt-0.5">실거래가 기반 급매물 자동 감지 서비스</p>
          </div>
          {!API_URL && (
            <span className="text-xs bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full">
              더미 데이터 모드
            </span>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

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
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        )}

        {/* 결과 */}
        {!loading && !error && (
          <>
            {/* 결과 수 + 페이지당 개수 */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                총 <span className="font-semibold text-gray-800">{filtered.length}건</span>의 급매물
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">페이지당</span>
                {[20, 50, 100].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setPerPage(n); setPage(1); }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                      perPage === n
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {n}개
                  </button>
                ))}
              </div>
            </div>

            {/* 매물 목록 */}
            {paginated.length > 0 ? (
              <div className="flex flex-col gap-2">
                {paginated.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400 text-sm">
                조건에 맞는 급매물이 없습니다
              </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-30 hover:border-blue-300 transition"
                >
                  이전
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span key={`dot-${idx}`} className="text-gray-300 text-sm">···</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 text-sm rounded-lg border transition ${
                          page === p
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-500 border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-30 hover:border-blue-300 transition"
                >
                  다음
                </button>
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