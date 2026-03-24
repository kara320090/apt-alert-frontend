"use client";

import { useMemo, useState } from "react";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import EmailForm from "../components/EmailForm";
import KakaoMap from "../components/KakaoMap";
import TopTabs from "../components/TopTabs";
import RegionReport from "../components/RegionReport";
import { useFilterState } from "@/hooks/useFilterState";
import { useRegionsQuery } from "@/hooks/useRegionsQuery";
import { useListingsQuery } from "@/hooks/useListingsQuery";
import { usePagination } from "@/hooks/usePagination";
import { useAiListings } from "@/hooks/useAiListings";
import { useSelectedListing } from "@/hooks/useSelectedListing";

function Pagination({ currentPage, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 py-6">
      <button
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ←
      </button>

      {pages.map((page, index) =>
        page === "..." ? (
          <span key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-sm font-bold text-gray-300">
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
              page === currentPage
                ? "bg-red-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        →
      </button>
    </div>
  );
}

export default function Home() {
  const { filters, setFilters } = useFilterState();
  const { regions } = useRegionsQuery();
  const { listings, pagination, loading, error } = useListingsQuery(filters);
  const { page, totalPages, total } = usePagination(pagination);
  const { displayListings, aiLoading } = useAiListings(listings, filters.aiEnabled);
  const { selectedListing, setSelectedListing } = useSelectedListing(displayListings);

  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    if (displayListings.length === 0) return;
    if (!selectedListing) {
      setSelectedListing(displayListings[0]);
    }
  }, [displayListings, selectedListing, setSelectedListing]);

  const visibleListings = useMemo(() => displayListings, [displayListings]);

  function handleFilterSubmit(nextFilters) {
    setFilters({
      region: nextFilters.region,
      grade: nextFilters.grade,
      minDiscount: nextFilters.minDiscount,
      aiEnabled: nextFilters.aiEnabled,
      page: 1,
    });
  }

  function handlePageChange(nextPage) {
    setFilters({ page: nextPage });
    document.querySelector(".feed-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="h-screen w-full flex overflow-hidden bg-white text-gray-900">
      <div className="w-full md:w-[45%] lg:w-[40%] h-full flex flex-col border-r border-gray-200 z-10 shadow-2xl relative bg-white">
        <header className="px-10 py-6 border-b border-gray-100 bg-white shrink-0 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-red-600 tracking-tight">🚨 급매물 알리미</h1>
            <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">
              실거래가 기반 초급매 감지 레이더
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-[11px] font-black px-3 py-1.5 rounded-full border ${
                filters.aiEnabled
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              AI {filters.aiEnabled ? "ON" : "OFF"}
            </span>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
          </div>
        </header>

        <div className="feed-scroll flex-1 overflow-y-auto w-full bg-slate-50 scroll-smooth shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
          <div className="max-w-2xl mx-auto w-full px-6 py-8">
            <TopTabs activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === "list" ? (
              <>
                <FilterBar
                  key={`${filters.region}-${filters.grade}-${filters.minDiscount}-${filters.aiEnabled}`}
                  value={filters}
                  onSubmit={handleFilterSubmit}
                  regions={regions}
                />

                <div className="flex items-center justify-between mb-4 mt-2">
                  <p className="text-sm font-bold text-gray-800">
                    {!loading ? (
                      <>
                        총 <span className="text-red-600">{total.toLocaleString()}</span>건의 급매물
                      </>
                    ) : (
                      "급매물 탐색 중"
                    )}
                  </p>
                  <div className="flex items-center gap-3">
                    {filters.aiEnabled && aiLoading && (
                      <p className="text-xs text-blue-500 font-bold">AI 입지 해석 중...</p>
                    )}
                    {!loading && totalPages > 1 && (
                      <p className="text-xs text-gray-400 font-bold">
                        {page} / {totalPages} 페이지
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <EmailForm filterParams={filters} regions={regions} />

                  {loading && (
                    <div className="py-10 text-center text-sm font-bold text-gray-400 animate-pulse">
                      레이더 가동 중...
                    </div>
                  )}

                  {error && (
                    <div className="py-10 text-center text-sm font-bold text-red-400">{error}</div>
                  )}

                  {!loading && !error && visibleListings.length === 0 && (
                    <div className="py-10 text-center text-sm font-bold text-gray-400">
                      조건에 맞는 급매물이 없습니다.
                    </div>
                  )}

                  {!loading &&
                    !error &&
                    visibleListings.map((listing) => (
                      <div
                        key={listing.id}
                        onClick={() => setSelectedListing(listing)}
                        className="w-full"
                      >
                        <ListingCard
                          listing={listing}
                          isSelected={selectedListing?.id === listing.id}
                        />
                      </div>
                    ))}

                  {!loading && !error && (
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onChange={handlePageChange}
                    />
                  )}
                </div>
              </>
            ) : (
              <RegionReport
                listings={visibleListings}
                aiEnabled={filters.aiEnabled}
                regions={regions}
              />
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:block flex-1 h-full bg-gray-100 relative">
        {activeTab === "list" && selectedListing ? (
          <KakaoMap listings={visibleListings} selectedId={selectedListing.id} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">
            {activeTab === "report"
              ? "지역 리포트 탭입니다. 목록 탭으로 돌아가면 지도가 표시됩니다."
              : "지도를 표시할 급매물이 없습니다."}
          </div>
        )}
      </div>
    </main>
  );
}
