"use client";

import { useEffect, useState } from "react";
import { dummyListings } from "../data/dummy";
import { enrichListings, applyFilter } from "../lib/filter";
import { fetchFilter, fetchRegions } from "../lib/api";
import { REGION_FALLBACK } from "../lib/constants/regions";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import EmailForm from "../components/EmailForm";
import KakaoMap from "../components/KakaoMap";
import TopTabs from "../components/TopTabs";
import RegionReport from "../components/RegionReport";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PER_PAGE = 20;

function mapItem(item) {
  return {
    id: item.id,
    apt_name: item.properties?.apt_name,
    area_size: item.properties?.area_size,
    region_name: item.region_name ?? item.properties?.dong,
    dong_name: item.dong_name ?? item.properties?.dong,
    price: item.price,
    market_avg: item.market_avg,
    discount_rate: item.discount_rate,
    grade: item.grade,
    ai_summary: item.ai_summary || "AI가 시세 대비 하락폭을 분석했습니다. 현재 진입하기 좋은 가격대입니다.",
    ai_tags: item.ai_tags || ["강한 가격 메리트", "시세 대비 큰 할인", "역세권", "생활편의 양호"],
  };
}

function Pagination({ currentPage, totalPages, hasMore, onChange }) {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  if (totalPages <= 1 && !hasMore) return null;

  return (
    <div className="flex items-center justify-center gap-1 py-6">
      <button
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ←
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
            p === currentPage
              ? "bg-red-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onChange(currentPage + 1)}
        disabled={!hasMore}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        →
      </button>
    </div>
  );
}

export default function Home() {
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [regions, setRegions] = useState(REGION_FALLBACK);
  const [activeTab, setActiveTab] = useState("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [filterParams, setFilterParams] = useState({
    region: "전체",
    grade: "전체",
    minDiscount: 10,
  });

  // Fetch regions from backend
  useEffect(() => {
    if (!API_URL) return;
    fetchRegions()
      .then((json) => {
        if (Array.isArray(json.data) && json.data.length > 0) setRegions(json.data);
      })
      .catch(() => {});
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(1);
  }, [filterParams]);

  // Fetch current page
  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError(null);
      setFiltered([]);
      try {
        let data;
        if (API_URL) {
          const json = await fetchFilter({ ...filterParams, page: currentPage, perPage: PER_PAGE });
          data = (json.data || []).map(mapItem);
          const more = data.length === PER_PAGE;
          setHasMore(more);
          setTotalPages((prev) => more ? Math.max(prev, currentPage + 1) : currentPage);
        } else {
          await new Promise((r) => setTimeout(r, 300));
          data = applyFilter(enrichListings(dummyListings), filterParams).map(mapItem);
          setHasMore(false);
          setTotalPages(1);
        }
        data.sort((a, b) => b.discount_rate - a.discount_rate);
        setFiltered(data);
      } catch (err) {
        console.error(err);
        setError("데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [currentPage, filterParams]);

  function handlePageChange(page) {
    setCurrentPage(page);
    // Scroll feed back to top
    document.querySelector(".feed-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="h-screen w-full flex overflow-hidden bg-white text-gray-900">

      {/* LEFT COLUMN: The Feed */}
      <div className="w-full md:w-[45%] lg:w-[40%] h-full flex flex-col border-r border-gray-200 z-10 shadow-2xl relative bg-white">

        {/* Sticky Header */}
        <header className="px-10 py-6 border-b border-gray-100 bg-white shrink-0 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-red-600 tracking-tight">🚨 급매물 알리미</h1>
            <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">실시간 초급매 감지 레이더</p>
          </div>
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
          </span>
        </header>

        {/* Scrollable Feed */}
        <div className="feed-scroll flex-1 overflow-y-auto w-full bg-slate-50 scroll-smooth shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
          <div className="max-w-2xl mx-auto w-full px-6 py-8">

            <TopTabs activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === "list" ? (
              <>
                <FilterBar onFilter={setFilterParams} regions={regions} />

                <div className="flex items-center justify-between mb-4 mt-2">
                  <p className="text-sm font-bold text-gray-800">
                    {!loading && filtered.length > 0 ? (
                      <>
                        <span className="text-red-600">{(currentPage - 1) * PER_PAGE + 1}</span>
                        {" ~ "}
                        <span className="text-red-600">{(currentPage - 1) * PER_PAGE + filtered.length}</span>
                        {"번째 급매물"}
                      </>
                    ) : "급매물 탐색 중"}
                  </p>
                  {!loading && totalPages > 1 && (
                    <p className="text-xs text-gray-400 font-bold">{currentPage} / {totalPages}{hasMore ? "+" : ""} 페이지</p>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {loading && (
                    <div className="py-10 text-center text-sm font-bold text-gray-400 animate-pulse">레이더 가동 중...</div>
                  )}
                  {error && (
                    <div className="py-10 text-center text-sm font-bold text-red-400">{error}</div>
                  )}
                  {!loading && !error && (
                    <>
                      {filtered.map((listing, index) => (
                        <div
                          key={listing.id}
                          onClick={() => setSelectedId(listing.id)}
                          className="w-full"
                        >
                          <ListingCard listing={listing} isSelected={selectedId === listing.id} />
                          {index === 2 && <EmailForm filterParams={filterParams} />}
                        </div>
                      ))}

                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        hasMore={hasMore}
                        onChange={handlePageChange}
                      />
                    </>
                  )}
                </div>
              </>
            ) : (
              <RegionReport listings={filtered} />
            )}

          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: The Persistent Map */}
      <div className="hidden md:block flex-1 h-full bg-gray-100 relative">
        <KakaoMap listings={filtered} selectedId={selectedId} />
      </div>

    </main>
  );
}
