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
import KakaoMap from "../components/KakaoMap";

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
  const [selectedListing, setSelectedListing] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [sortType, setSortType] = useState("discount");

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

  const sortedListings = useMemo(() => {
    const copied = [...displayListings];

    if (sortType === "priceLow") {
      copied.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      return copied;
    }

    if (sortType === "priceHigh") {
      copied.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
      return copied;
    }

    copied.sort((a, b) => Number(b.discount_rate || 0) - Number(a.discount_rate || 0));
    return copied;
  }, [displayListings, sortType]);

  function handleQuickGrade(grade) {
    setFilterParams((prev) => ({
      ...prev,
      grade,
    }));
    setPage(1);
  }

  function handleFilter(params) {
    setFilterParams(params);
    setPage(1);
  }

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
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 sm:px-5 sm:py-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-blue-600">MAP DASHBOARD</p>
              <p className="text-sm text-gray-500 mt-1">
                지도 기반으로 급매물을 빠르게 탐색하고, 리스트 클릭 시 우측 지도에서 즉시 위치를 확인할 수 있습니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                오늘 업데이트
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {filtered.length}건
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[480px_minmax(0,1fr)] gap-6 items-start">
          <section>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <TopTabs activeTab={activeTab} onChange={setActiveTab} />

              <FilterBar onFilter={handleFilter} />

              <div className="mb-4 flex flex-wrap items-center gap-2">
                {[
                  { key: "전체", label: "전체" },
                  { key: "초급매", label: "초급매" },
                  { key: "급매", label: "급매" },
                  { key: "저평가", label: "저평가" },
                ].map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => handleQuickGrade(chip.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      filterParams.grade === chip.key
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {filterParams.aiEnabled && (
                <div className="mb-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">AI 해석 모드</p>
                  <p className="text-sm text-blue-900">
                    현재 페이지 매물에 대해 가격 해석 + 역세권/학교/병원/생활편의 태그를 표시합니다.
                  </p>
                </div>
              )}
            </div>

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
                        <select
                          value={sortType}
                          onChange={(e) => setSortType(e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600"
                        >
                          <option value="discount">할인율 높은순</option>
                          <option value="priceLow">가격 낮은순</option>
                          <option value="priceHigh">가격 높은순</option>
                        </select>

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

                    {sortedListings.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {sortedListings.map((listing) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            aiEnabled={filterParams.aiEnabled}
                            mapMode={isDesktop ? "panel" : "modal"}
                            onOpenMap={(item) => setSelectedListing(item)}
                            isSelected={isDesktop && selectedListing?.id === listing.id}
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
          </section>

          <aside className="hidden xl:block sticky top-6">
            {activeTab === "list" && selectedListing ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 mb-2">선택된 매물</p>
                  <p className="text-base font-bold text-gray-900">{selectedListing.apt_name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedListing.region_name} · {selectedListing.area_size}㎡ · {selectedListing.floor}층
                  </p>
                </div>

                <KakaoMap
                  listing={selectedListing}
                  embedded
                  contentHeightClass="h-[70vh]"
                />
              </div>
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