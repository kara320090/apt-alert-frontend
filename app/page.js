"use client";

import { useEffect, useMemo, useState } from "react";
import { dummyListings, regions as fallbackRegions } from "../data/dummy";
import { enrichListings, applyFilter } from "../lib/filter";
import { enrichWithPriceAiOnly } from "../lib/aiSummary";
import { fetchAiListingTags, fetchFilter, fetchRegions } from "../lib/api";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import EmailForm from "../components/EmailForm";
import TopTabs from "../components/TopTabs";
import RegionReport from "../components/RegionReport";
import KakaoMap from "../components/KakaoMap";

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

export default function Home() {
  const [regions, setRegions] = useState(fallbackRegions);
  const [filtered, setFiltered] = useState([]);
  const [displayListings, setDisplayListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [activeTab, setActiveTab] = useState("list");
  const [selectedListing, setSelectedListing] = useState(null);

  const [filterParams, setFilterParams] = useState({
    region: "전체",
    grade: "전체",
    minDiscount: 5,
    aiEnabled: false,
  });

  const resolvedSelectedListing = selectedListing || displayListings[0] || null;

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
            region: filterParams.region,
            grade: filterParams.grade,
            minDiscount: filterParams.minDiscount,
            page,
            perPage,
          });

          items = (json?.data || []).map(mapItem);
          count = Number(json?.count || 0);
          pages = Number(json?.total_pages || 1);
        } else {
          await new Promise((r) => setTimeout(r, 300));

          const localFiltered = applyFilter(enrichListings(dummyListings), {
            region: filterParams.region,
            grade: filterParams.grade,
            minDiscount: filterParams.minDiscount,
          });

          count = localFiltered.length;
          pages = Math.max(1, Math.ceil(count / perPage));
          items = localFiltered.slice((page - 1) * perPage, page * perPage);
        }

        if (!ignore) {
          setFiltered(items);
          setTotalCount(count);
          setTotalPages(pages);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setError(err?.message || "데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
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
  }, [filterParams.region, filterParams.grade, filterParams.minDiscount, page, perPage]);

  const paginatedRaw = useMemo(() => filtered, [filtered]);

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
          setDisplayListings(json?.data || []);
        }
      } catch (err) {
        console.error(err);
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

  useEffect(() => {
    if (displayListings.length === 0) {
      setSelectedListing(null);
      return;
    }

    setSelectedListing((prev) => {
      if (!prev) return displayListings[0];
      const matched = displayListings.find((item) => item.id === prev.id);
      return matched || displayListings[0];
    });
  }, [displayListings]);

  function handleFilter(params) {
    setFilterParams({
      region: params.region,
      grade: params.grade,
      minDiscount: params.minDiscount,
      aiEnabled: params.aiEnabled,
    });
    setPage(1);
  }

  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex items-center justify-between">
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

      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[440px_minmax(0,1fr)] gap-6 items-start">
          <section>
            <TopTabs activeTab={activeTab} onChange={setActiveTab} />

            <FilterBar
              onFilter={handleFilter}
              regions={regions}
              initialValue={filterParams}
            />

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
                        총 <span className="font-semibold text-gray-800">{totalCount}건</span>의 급매물
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
                            mapMode="panel"
                            onOpenMap={(item) => setSelectedListing(item)}
                            isSelected={resolvedSelectedListing?.id === listing.id}
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

                        {pageButtons.map((p, idx) =>
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
                    listings={displayListings}
                    aiEnabled={filterParams.aiEnabled}
                    regions={regions}
                    selectedRegion={filterParams.region}
                  />
                )}
              </>
            )}

            <EmailForm regions={regions} />
          </section>

          <aside className="block sticky top-6">
            {activeTab === "list" ? (
              <KakaoMap
                listings={displayListings}
                selectedId={resolvedSelectedListing?.id ?? null}
              />
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-sm text-gray-500 min-h-[520px] flex items-center justify-center">
                리포트 탭에서는 목록 탭으로 이동하면 지도가 표시됩니다.
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}