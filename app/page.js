"use client";

import { useEffect, useMemo, useState } from "react";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import EmailForm from "../components/EmailForm";
import TopTabs from "../components/TopTabs";
import RegionReport from "../components/RegionReport";
import KakaoMap from "../components/KakaoMap";

import { useFilterState } from "@/hooks/useFilterState";
import { useRegionsQuery } from "@/hooks/useRegionsQuery";
import { useListingsQuery } from "@/hooks/useListingsQuery";
import { usePagination } from "@/hooks/usePagination";
import { useAiListings } from "@/hooks/useAiListings";
import { useSelectedListing } from "@/hooks/useSelectedListing";

export default function Home() {
  const { filters, setFilters } = useFilterState();
  const { regions } = useRegionsQuery();
  const { listings, pagination, loading, error } = useListingsQuery(filters);
  const { total, totalPages, perPage, page } = usePagination(pagination);
  const { displayListings, aiLoading } = useAiListings(listings, filters.aiEnabled);
  const { selectedListing, setSelectedListing } = useSelectedListing(displayListings);

  const [activeTab, setActiveTab] = useState("list");
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const syncDesktop = (event) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(media.matches);
    media.addEventListener("change", syncDesktop);

    return () => {
      media.removeEventListener("change", syncDesktop);
    };
  }, []);

  function handleFilter(nextFilters) {
    setFilters({
      region: nextFilters.region,
      grade: nextFilters.grade,
      minDiscount: nextFilters.minDiscount,
      aiEnabled: nextFilters.aiEnabled,
      page: 1,
    });
  }

  const pageButtons = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
      .reduce((acc, p, idx, arr) => {
        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
        acc.push(p);
        return acc;
      }, []);
  }, [page, totalPages]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">급매물 알리미</h1>
            <p className="text-xs text-gray-400 mt-0.5">실거래가 기반 급매물 자동 감지 서비스</p>
          </div>

          <div className="flex items-center gap-2">
            {!process.env.NEXT_PUBLIC_API_URL && (
              <span className="text-xs bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full">
                더미 데이터 모드
              </span>
            )}
            <span
              className={`text-xs px-3 py-1 rounded-full ${
                filters.aiEnabled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              AI {filters.aiEnabled ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[440px_minmax(0,1fr)] gap-6 items-start">
          <section>
            <TopTabs activeTab={activeTab} onChange={setActiveTab} />

            <FilterBar value={filters} regions={regions} onSubmit={handleFilter} />

            {filters.aiEnabled && (
              <div className="mb-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">AI 해석 모드</p>
                <p className="text-sm text-blue-900">
                  현재 페이지 매물에 대해 가격 해석 + 역세권/학교/병원/생활편의 태그를 표시합니다.
                </p>
              </div>
            )}

            {loading && <div className="text-center py-16 text-gray-400 text-sm">급매물 불러오는 중...</div>}

            {error && <div className="text-center py-16 text-red-400 text-sm">{error}</div>}

            {!loading && !error && (
              <>
                {activeTab === "list" && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-500">
                        총 <span className="font-semibold text-gray-800">{total}건</span>의 급매물
                      </p>

                      <div className="flex items-center gap-2">
                        {filters.aiEnabled && aiLoading && (
                          <span className="text-xs text-blue-500">AI 태그 계산 중...</span>
                        )}

                        <span className="text-xs text-gray-400">페이지당</span>
                        {[20, 50, 100].map((n) => (
                          <button
                            key={n}
                            onClick={() => setFilters({ perPage: n, page: 1 })}
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

                    {displayListings.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {displayListings.map((listing) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            aiEnabled={filters.aiEnabled}
                            mapMode={isDesktop ? "panel" : "modal"}
                            onOpenMap={(item) => setSelectedListing(item)}
                            isSelected={isDesktop && selectedListing?.id === listing.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-400 text-sm">조건에 맞는 급매물이 없습니다</div>
                    )}

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                          onClick={() => setFilters({ page: Math.max(1, page - 1) })}
                          disabled={page === 1}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-30 hover:border-blue-300 transition"
                        >
                          이전
                        </button>

                        {pageButtons.map((p, idx) =>
                          p === "..." ? (
                            <span key={`dot-${idx}`} className="text-gray-300 text-sm">
                              ···
                            </span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setFilters({ page: p })}
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
                          onClick={() => setFilters({ page: Math.min(totalPages, page + 1) })}
                          disabled={page === totalPages}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-30 hover:border-blue-300 transition"
                        >
                          다음
                        </button>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "report" && (
                  <RegionReport listings={listings} aiEnabled={filters.aiEnabled} regions={regions} />
                )}
              </>
            )}

            <EmailForm regions={regions} />
          </section>

          <aside className="hidden xl:block sticky top-6">
            {activeTab === "list" && selectedListing ? (
              <KakaoMap listing={selectedListing} embedded contentHeightClass="h-[68vh]" />
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-sm text-gray-500">
                {activeTab === "report"
                  ? "리포트 탭에서는 목록 탭으로 이동하면 지도 패널이 표시됩니다."
                  : "지도를 표시할 매물이 없습니다."}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
