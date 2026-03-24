"use client";

import { useEffect, useState } from "react";
import { dummyListings, regions as fallbackRegions } from "../data/dummy";
import { enrichListings, applyFilter } from "../lib/filter";
import { enrichWithPriceAiOnly } from "../lib/aiSummary";
import { fetchAiListingTags, fetchFilter, fetchRegions } from "../lib/api";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import EmailForm from "../components/EmailForm";
import KakaoMap from "../components/KakaoMap";
import TopTabs from "../components/TopTabs";
import RegionReport from "../components/RegionReport";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function mapItem(item) {
  const properties = item?.properties || {};

  return {
    id: item?.id,
    apt_seq: item?.apt_seq || properties?.apt_seq || null,
    apt_name: item?.apt_name || properties?.apt_name || "",
    area_size: Number(item?.area_size ?? properties?.area_size ?? 0),
    region_code: item?.region_code || properties?.region_code || "",
    region_name:
      item?.region_name ||
      item?.dong_name ||
      properties?.region_name ||
      properties?.dong_name ||
      properties?.dong ||
      "",
    dong_name:
      item?.dong_name ||
      properties?.dong_name ||
      properties?.dong ||
      item?.region_name ||
      "",
    price: Number(item?.price ?? 0),
    floor: Number(item?.floor ?? 0),
    deal_year: parseInt(String(item?.deal_date || "").split("-")?.[0] || "0", 10),
    deal_month: parseInt(String(item?.deal_date || "").split("-")?.[1] || "0", 10),
    cdeal_type: item?.is_cancelled ? "Y" : "",
    market_avg: Number(item?.market_avg ?? 0),
    discount_rate: Number(item?.discount_rate ?? 0),
    grade: item?.grade || "일반",
    lat: item?.lat ?? null,
    lng: item?.lng ?? null,
  };
}

function Pagination({ currentPage, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== ".") {
      pages.push(".");
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
        page === "." ? (
          <span
            key={`ellipsis-${index}`}
            className="w-8 h-8 flex items-center justify-center text-sm font-bold text-gray-300"
          >
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
  const [regions, setRegions] = useState(fallbackRegions);
  const [rawListings, setRawListings] = useState([]);
  const [visibleListings, setVisibleListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [activeTab, setActiveTab] = useState("list");
  const [selectedListing, setSelectedListing] = useState(null);

  const [filters, setFilters] = useState({
    region: "전체",
    grade: "전체",
    minDiscount: 5,
    aiEnabled: false,
  });

  const resolvedSelectedListing = selectedListing || visibleListings[0] || null;

  useEffect(() => {
    let ignore = false;

    async function loadRegions() {
      if (!API_URL) return;

      try {
        const json = await fetchRegions();
        const names = Array.isArray(json?.data) ? json.data : [];
        if (!ignore && names.length > 0) {
          setRegions(names);
        }
      } catch (err) {
        console.error("regions load failed:", err);
      }
    }

    loadRegions();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        let items = [];
        let count = 0;
        let pages = 1;

        if (API_URL) {
          const json = await fetchFilter({
            region: filters.region,
            grade: filters.grade,
            minDiscount: filters.minDiscount,
            page,
            perPage,
          });

          items = (json?.data || []).map(mapItem);
          count = Number(json?.count || 0);
          pages = Number(json?.total_pages || 1);
        } else {
          await new Promise((r) => setTimeout(r, 250));

          const localFiltered = applyFilter(enrichListings(dummyListings), {
            region: filters.region,
            grade: filters.grade,
            minDiscount: filters.minDiscount,
          });

          count = localFiltered.length;
          pages = Math.max(1, Math.ceil(count / perPage));
          items = localFiltered.slice((page - 1) * perPage, page * perPage);
        }

        if (!ignore) {
          setRawListings(items);
          setTotal(count);
          setTotalPages(pages);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setError(err?.message || "데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
          setRawListings([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [filters.region, filters.grade, filters.minDiscount, page, perPage]);

  useEffect(() => {
    let ignore = false;

    async function enrichVisiblePage() {
      if (!filters.aiEnabled) {
        setVisibleListings(
          rawListings.map((item) => ({
            ...item,
            ai_tags: [],
            ai_summary: "",
            ai_location_meta: null,
          }))
        );
        setAiLoading(false);
        return;
      }

      if (rawListings.length === 0) {
        setVisibleListings([]);
        setAiLoading(false);
        return;
      }

      setAiLoading(true);

      try {
        const json = await fetchAiListingTags(rawListings);
        if (!ignore) {
          setVisibleListings(json?.data || []);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setVisibleListings(enrichWithPriceAiOnly(rawListings, true));
        }
      } finally {
        if (!ignore) {
          setAiLoading(false);
        }
      }
    }

    enrichVisiblePage();

    return () => {
      ignore = true;
    };
  }, [rawListings, filters.aiEnabled]);

  useEffect(() => {
    if (visibleListings.length === 0) {
      setSelectedListing(null);
      return;
    }

    setSelectedListing((prev) => {
      if (!prev) return visibleListings[0];
      const matched = visibleListings.find((item) => item.id === prev.id);
      return matched || visibleListings[0];
    });
  }, [visibleListings]);

  function handleFilterSubmit(nextFilters) {
    setFilters({
      region: nextFilters.region,
      grade: nextFilters.grade,
      minDiscount: nextFilters.minDiscount,
      aiEnabled: nextFilters.aiEnabled,
    });
    setPage(1);
  }

  function handlePageChange(nextPage) {
    setPage(nextPage);
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
                  <EmailForm regions={regions} />

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
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        aiEnabled={filters.aiEnabled}
                        mapMode="panel"
                        onOpenMap={(item) => setSelectedListing(item)}
                        isSelected={resolvedSelectedListing?.id === listing.id}
                      />
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
                selectedRegion={filters.region}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 h-full bg-gray-100 relative">
        {activeTab === "list" ? (
          <KakaoMap
            listings={visibleListings}
            selectedId={resolvedSelectedListing?.id ?? null}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">
            지역 리포트 탭입니다. 목록 탭으로 돌아가면 지도가 표시됩니다.
          </div>
        )}
      </div>
    </main>
  );
}