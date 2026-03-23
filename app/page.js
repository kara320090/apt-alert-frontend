"use client";

import { useEffect, useMemo, useState } from "react";
import { dummyListings } from "../data/dummy";
import { enrichListings, applyFilter } from "../lib/filter";
import { fetchFilter, fetchRegions } from "../lib/api";
import { REGION_FALLBACK } from "../lib/constants/regions";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import EmailForm from "../components/EmailForm";
import KakaoMap from "../components/KakaoMap";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

export default function Home() {
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(15);
  const [selectedId, setSelectedId] = useState(null);
  const [regions, setRegions] = useState(REGION_FALLBACK);

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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        let data;
        if (API_URL) {
          const json = await fetchFilter(filterParams);
          data = (json.data || []).map(mapItem);
        } else {
          await new Promise((r) => setTimeout(r, 300));
          data = applyFilter(enrichListings(dummyListings), filterParams);
          data = data.map(mapItem);
        }
        const sorted = data.sort((a, b) => b.discount_rate - a.discount_rate);
        setFiltered(sorted);
      } catch (err) {
        console.error(err);
        setError("데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filterParams]);

  const displayListings = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

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
        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 bg-slate-100 scroll-smooth shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
          <FilterBar onFilter={setFilterParams} regions={regions} />

          <div className="flex items-center justify-between mb-4 mt-2">
            <p className="text-sm font-bold text-gray-800">
              발견된 급매물 <span className="text-red-600">{filtered.length}</span>건
            </p>
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
                {displayListings.map((listing, index) => (
                  <div
                    key={listing.id}
                    onClick={() => setSelectedId(listing.id)}
                    className="w-full"
                  >
                    <ListingCard listing={listing} isSelected={selectedId === listing.id} />
                    {index === 2 && (
                      <div className="my-6">
                        <EmailForm filterParams={filterParams} />
                      </div>
                    )}
                  </div>
                ))}

                {visibleCount < filtered.length && (
                  <button
                    onClick={() => setVisibleCount(v => v + 15)}
                    className="w-full py-4 mt-4 bg-white border border-slate-200 text-gray-900 font-bold rounded-xl hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm transition-all"
                  >
                    급매물 더 보기 ↓
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: The Persistent Map */}
      <div className="hidden md:block flex-1 h-full bg-gray-100 relative">
        <KakaoMap listings={displayListings} selectedId={selectedId} />
      </div>

    </main>
  );
}
