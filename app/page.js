"use client";

import { useEffect, useMemo, useState } from "react";
import { dummyListings } from "../data/dummy";
import { enrichListings, applyFilter } from "../lib/filter";
import { enrichWithPriceAiOnly } from "../lib/aiSummary";
import { fetchAiListingTags, fetchFilter } from "../lib/api";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import EmailForm from "../components/EmailForm";
import TopTabs from "../components/TopTabs";
import RegionReport from "../components/RegionReport";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function mapItem(item) {
  return {
    id: item.id,
    apt_seq: item.properties?.apt_seq,
    apt_name: item.properties?.apt_name,
    area_size: item.properties?.area_size,
    region_code: item.properties?.region_code,
    region_name: item.properties?.dong ?? item.region_name,
    price: item.price,
    floor: item.floor,
    deal_year: parseInt(item.deal_date?.split("-")?.[0]),
    deal_month: parseInt(item.deal_date?.split("-")?.[1]),
    cdeal_type: item.is_cancelled ? "Y" : "",
    market_avg: item.market_avg,
    discount_rate: item.discount_rate,
    grade: item.grade,
  };
}

export default function Home() {
  const [filtered, setFiltered] = useState([]);
  const [displayListings, setDisplayListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState("list");

  const [filterParams, setFilterParams] = useState({
    region: "전체",
    grade: "전체",
    maxDiscount: 5,
    aiEnabled: false,
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        let data;

        if (API_URL) {
          const json = await fetchFilter({
            region: filterParams.region,
            grade: filterParams.grade,
            minDiscount: filterParams.maxDiscount,
          });

          data = json.data.map(mapItem);
        } else {
          await new Promise((r) => setTimeout(r, 300));
          data = applyFilter(enrichListings(dummyListings), {
            region: filterParams.region,
            grade: filterParams.grade,
            minDiscount: filterParams.maxDiscount,
          });
        }

        setFiltered(data);
      } catch (err) {
        console.error(err);
        setError("데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [filterParams.region, filterParams.grade, filterParams.maxDiscount]);

  const totalPages = Math.ceil(filtered.length / perPage);

  const paginatedRaw = useMemo(() => {
    return filtered.slice((page - 1) * perPage, page * perPage);
  }, [filtered, page, perPage]);

  useEffect(() => {
    let ignore = false;

    async function enrichVisiblePage() {
      if (!filterParams.aiEnabled) {
        setDisplayListings(
          paginatedRaw.map((item) => ({
            ...item,
            ai_tags: [],
            ai_summary: "",
            ai_location_meta: null,
          }))
        );
        setAiLoading(false);
        return;
      }

      if (paginatedRaw.length === 0) {
        setDisplayListings([]);
        setAiLoading(false);
        return;
      }

      setAiLoading(true);

      try {
        const json = await fetchAiListingTags(paginatedRaw);
        if (!ignore) {
          setDisplayListings(json.data || []);
        }
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setDisplayListings(enrichWithPriceAiOnly(paginatedRaw, true));
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
  }, [paginatedRaw, filterParams.aiEnabled]);

  function handleFilter(params) {
    setFilterParams(params);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">급매물 알리미</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              실거래가 기반 급매물 자동 감지 서비스
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!API_URL && (
              <span className="text-xs bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full">
                더미 데이터 모드
              </span>
            )}
            <span
              className={`text-xs px-3 py-1 rounded-full ${
                filterParams.aiEnabled
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              AI {filterParams.aiEnabled ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <TopTabs activeTab={activeTab} onChange={setActiveTab} />

        <FilterBar onFilter={handleFilter} />

        {filterParams.aiEnabled && (
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-blue-700 mb-1">AI 해석 모드</p>
            <p className="text-sm text-blue-900">
              현재 페이지 매물에 대해 가격 해석 + 역세권/학교/병원/생활편의 태그를 표시합니다.
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">
            급매물 불러오는 중...
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        )}

        {!loading && !error && (
          <>
            {activeTab === "list" && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">
                    총 <span className="font-semibold text-gray-800">{filtered.length}건</span>의 급매물
                  </p>

                  <div className="flex items-center gap-2">
                    {filterParams.aiEnabled && aiLoading && (
                      <span className="text-xs text-blue-500">AI 태그 계산 중...</span>
                    )}

                    <span className="text-xs text-gray-400">페이지당</span>
                    {[20, 50, 100].map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setPerPage(n);
                          setPage(1);
                        }}
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
                        aiEnabled={filterParams.aiEnabled}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400 text-sm">
                    조건에 맞는 급매물이 없습니다
                  </div>
                )}

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
                          <span key={`dot-${idx}`} className="text-gray-300 text-sm">
                            ···
                          </span>
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

            {activeTab === "report" && (
              <RegionReport
                listings={filtered}
                aiEnabled={filterParams.aiEnabled}
              />
            )}
          </>
        )}

        <EmailForm />
      </div>
    </main>
  );
}