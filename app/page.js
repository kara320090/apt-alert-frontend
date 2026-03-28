"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dummyListings, regions as fallbackRegions } from "../data/dummy";
import {
  enrichListings,
  applyFilter,
  calcMarketAvg,
  calcDiscountRate,
  classifyGrade,
} from "../lib/filter";
import { clearAiMeta, enrichWithPriceAiOnly } from "../lib/aiSummary";
import { fetchAiListingTags, fetchRegions, fetchListings } from "../lib/api";
import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import EmailForm from "../components/EmailForm";
import KakaoMap from "../components/KakaoMap";
import TopTabs from "../components/TopTabs";
import RegionReport from "../components/RegionReport";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const LEFT_PANEL_STORAGE_KEY = "apt-alert-left-panel-collapsed-v2";
const AI_ENABLED_STORAGE_KEY = "apt-alert-ai-enabled";
const LISTINGS_FETCH_PER_PAGE = 500;
const MAX_LISTINGS_FETCH_PAGES = 20;

function mapItems(items) {
  return (items || []).map(mapItem);
}

function recalcMarketByTwelveMonths(items, referenceTrades = items) {
  const pool = referenceTrades || [];

  return (items || []).map((item) => {
    const marketAvg = calcMarketAvg(pool, item) || 0;
    const discountRate = calcDiscountRate(Number(item.price || 0), marketAvg);

    return {
      ...item,
      market_avg: marketAvg,
      discount_rate: discountRate,
      grade: classifyGrade(discountRate),
    };
  });
}

async function fetchReferenceTrades(pageItems, regionFilter, signal) {
  if (!API_URL) return [];

  const collected = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages && currentPage <= MAX_LISTINGS_FETCH_PAGES) {
    const json = await fetchListings({
      region: regionFilter,
      page: currentPage,
      perPage: LISTINGS_FETCH_PER_PAGE,
      signal,
    });

    const mapped = mapItems(json?.data || []);
    collected.push(...mapped);

    const apiTotalPages = Number(json?.total_pages || 1);
    totalPages = Number.isFinite(apiTotalPages) && apiTotalPages > 0 ? apiTotalPages : 1;

    if (mapped.length === 0) break;
    currentPage += 1;
  }

  return collected;
}

function mapItem(item) {
  const properties = item?.properties || {};
  const price = Number(item?.price ?? 0);

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
    price,
    floor: Number(item?.floor ?? 0),
    deal_year: parseInt(String(item?.deal_date || "").split("-")?.[0] || "0", 10),
    deal_month: parseInt(String(item?.deal_date || "").split("-")?.[1] || "0", 10),
    cdeal_type: item?.is_cancelled ? "Y" : "",
    market_avg: 0,
    discount_rate: Number(item?.discount_rate ?? 0),
    grade: item?.grade || "일반",
    lat: item?.lat ?? null,
    lng: item?.lng ?? null,
    ai_tags: item?.ai_tags || [],
    ai_summary: item?.ai_summary || "",
    risk: item?.risk || null,
    price_trend: item?.price_trend || null,
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

function buildFilterSummary(filters) {
  return [
    filters.region === "전체" ? "전지역" : filters.region,
    filters.grade === "전체" ? "전체등급" : filters.grade,
    `할인 ${filters.minDiscount}%+`,
    `${filters.perPage}개/페이지`,
    filters.aiEnabled ? "AI ON" : "AI OFF",
  ];
}

export default function Home() {
  const [regions, setRegions] = useState(fallbackRegions);
  const [rawListings, setRawListings] = useState([]);
  const [visibleListings, setVisibleListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [activeTab, setActiveTab] = useState("list");
  const [selectedListing, setSelectedListing] = useState(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const [filters, setFilters] = useState({
    region: "전체",
    grade: "전체",
    minDiscount: 5,
    perPage: 20,
    aiEnabled: false,
  });
  const perPage = filters.perPage;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedAi = localStorage.getItem(AI_ENABLED_STORAGE_KEY) === "true";
    if (savedAi) setFilters((prev) => ({ ...prev, aiEnabled: true }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(AI_ENABLED_STORAGE_KEY, String(filters.aiEnabled));
  }, [filters.aiEnabled]);

  const resolvedSelectedListing = selectedListing || visibleListings[0] || null;
  const filterSummary = useMemo(() => buildFilterSummary(filters), [filters]);
  const desktopCollapsed = !isMobile && leftPanelCollapsed;
  const showPanelContent = isMobile ? mobilePanelOpen : !desktopCollapsed;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(LEFT_PANEL_STORAGE_KEY);
      if (saved === "1") setLeftPanelCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LEFT_PANEL_STORAGE_KEY, leftPanelCollapsed ? "1" : "0");
    } catch {}
  }, [leftPanelCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 767px)");
    const sync = (event) => {
      const mobile = event.matches;
      setIsMobile(mobile);
      if (!mobile) setMobilePanelOpen(false);
    };

    setIsMobile(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadRegions() {
      if (!API_URL) return;

      try {
        const json = await fetchRegions({ signal: controller.signal });
        const names = Array.isArray(json?.data) ? json.data : [];
        if (!ignore && names.length > 0) {
          const deduped = Array.from(new Set(names.filter(Boolean)));
          const normalized = deduped.includes("전체") ? deduped : ["전체", ...deduped];
          setRegions(normalized);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("regions load failed:", err);
      }
    }

    loadRegions();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        let items = [];
        let count = 0;
        let pages = 1;

        if (API_URL) {
          const baseTrades = await fetchReferenceTrades(
            [],
            filters.region,
            controller.signal
          );
          const enriched = recalcMarketByTwelveMonths(baseTrades);
          const locallyFiltered = applyFilter(enriched, {
            region: filters.region,
            grade: filters.grade,
            minDiscount: filters.minDiscount,
          });

          count = locallyFiltered.length;
          pages = Math.max(1, Math.ceil(count / perPage));
          const start = (page - 1) * perPage;
          items = locallyFiltered.slice(start, start + perPage);
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
        if (err?.name === "AbortError") return;
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
      controller.abort();
    };
  }, [filters.region, filters.grade, filters.minDiscount, page, perPage]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function enrichVisiblePage() {
      if (!filters.aiEnabled) {
        setVisibleListings(clearAiMeta(rawListings));
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
        const json = await fetchAiListingTags(rawListings, { signal: controller.signal });
        if (!ignore) {
          setVisibleListings(json?.data || []);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error(err);
        if (!ignore) {
          setVisibleListings(enrichWithPriceAiOnly(rawListings));
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
      controller.abort();
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

  useEffect(() => {
    if (!resolvedSelectedListing?.id || activeTab !== "list") return;
    const el = document.getElementById(`listing-card-${resolvedSelectedListing.id}`);
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [resolvedSelectedListing?.id, activeTab]);

  const handleFilterSubmit = useCallback((nextFilters) => {
    setFilters({
      region: nextFilters.region,
      grade: nextFilters.grade,
      minDiscount: nextFilters.minDiscount,
      perPage: nextFilters.perPage,
      aiEnabled: nextFilters.aiEnabled,
    });
    setPage(1);
    if (isMobile) setMobilePanelOpen(false);
  }, [isMobile]);

  const handlePageChange = useCallback((nextPage) => {
    setPage(nextPage);
  }, []);

  const handleMapSelect = useCallback(
    (listingId) => {
      const found = visibleListings.find((item) => item.id === listingId);
      if (found) {
        setSelectedListing(found);
        if (isMobile) setMobilePanelOpen(false);
      }
    },
    [visibleListings, isMobile]
  );

  const toggleLeftPanel = useCallback(() => {
    if (isMobile) {
      setMobilePanelOpen((prev) => !prev);
      return;
    }
    setLeftPanelCollapsed((prev) => !prev);
  }, [isMobile]);

  const closeMobilePanel = useCallback(() => setMobilePanelOpen(false), []);

  const panelClasses = isMobile
    ? `absolute inset-y-0 left-0 z-40 w-[88vw] max-w-[420px] bg-white border-r border-gray-200 shadow-2xl transform transition-transform duration-300 ${mobilePanelOpen ? "translate-x-0" : "-translate-x-full"}`
    : `h-full flex flex-col border-r border-gray-200 z-10 shadow-2xl relative bg-white transition-[width,min-width,max-width] duration-300 ease-out ${desktopCollapsed ? "w-[92px] min-w-[92px] max-w-[92px]" : "w-full md:w-[34%] lg:w-[30%] min-w-[320px] max-w-[420px]"}`;

  return (
    <main className="h-screen w-full flex overflow-hidden bg-white text-gray-900 relative">
      {isMobile && mobilePanelOpen && (
        <button
          aria-label="메뉴 닫기"
          onClick={closeMobilePanel}
          className="absolute inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
        />
      )}

      {isMobile && !mobilePanelOpen && (
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
          <button
            onClick={toggleLeftPanel}
            className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-lg text-slate-700 hover:bg-slate-50 transition"
            aria-label="필터 및 목록 열기"
            title="필터 및 목록 열기"
          >
            ≡
          </button>
          <div className="bg-white/90 border border-slate-200 rounded-2xl shadow-lg px-3 py-2 backdrop-blur text-[11px] font-bold text-slate-600 max-w-[180px]">
            <div className="text-[10px] text-slate-400 font-black uppercase mb-1">현재 필터</div>
            <div className="flex flex-wrap gap-1.5">
              {filterSummary.slice(0, 3).map((item) => (
                <span key={item} className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={panelClasses}>
        <header className={`border-b border-gray-100 bg-white shrink-0 flex items-center justify-between transition-all duration-300 ${desktopCollapsed ? "px-3 py-4" : "px-8 py-5"}`}>
          {desktopCollapsed ? (
            <div className="w-full flex flex-col items-center gap-3">
              <button
                onClick={toggleLeftPanel}
                className="w-11 h-11 rounded-2xl bg-red-600 text-white shadow-md hover:bg-red-700 transition"
                aria-label="왼쪽 메뉴 열기"
                title="왼쪽 메뉴 열기"
              >
                ≡
              </button>

              <div className="flex flex-col items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    setActiveTab("list");
                    setLeftPanelCollapsed(false);
                  }}
                  className={`w-11 h-11 rounded-xl text-sm font-black border transition ${
                    activeTab === "list"
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                  title="목록"
                >
                  목
                </button>
                <button
                  onClick={() => {
                    setActiveTab("report");
                    setLeftPanelCollapsed(false);
                  }}
                  className={`w-11 h-11 rounded-xl text-sm font-black border transition ${
                    activeTab === "report"
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                  title="리포트"
                >
                  리
                </button>
              </div>

              <div className="mt-2 flex flex-col items-center gap-2 w-full">
                <div className="text-[10px] font-black text-slate-400 tracking-wider">건수</div>
                <div className="text-sm font-black text-red-600">{total}</div>
                <div className="w-full flex flex-col gap-1.5 mt-1">
                  {filterSummary.map((item) => (
                    <div key={item} className="mx-auto max-w-[74px] text-center text-[10px] font-bold text-slate-600 bg-slate-100 rounded-full px-2 py-1 leading-tight break-keep">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-xl font-black text-red-600 tracking-tight">🚨 급매물 알리미</h1>
                <p className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                  실거래가 기반 초급매 감지 레이더
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleLeftPanel}
                  className="w-10 h-10 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                  aria-label={isMobile ? "왼쪽 메뉴 닫기" : "왼쪽 메뉴 접기"}
                  title={isMobile ? "왼쪽 메뉴 닫기" : "왼쪽 메뉴 접기"}
                >
                  {isMobile ? "✕" : "←"}
                </button>
                <span
                  className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${
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
            </>
          )}
        </header>

        {showPanelContent && (
          <div className="feed-scroll flex-1 overflow-y-auto w-full bg-slate-50 scroll-smooth shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
            <div className="max-w-2xl mx-auto w-full px-5 py-6">
              <TopTabs activeTab={activeTab} onChange={setActiveTab} />

              {activeTab === "list" ? (
                <>
                  <FilterBar
                    initialValue={filters}
                    onFilter={handleFilterSubmit}
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
                    <EmailForm
                      regions={regions}
                      initialRegion={filters.region}
                      initialMinDiscount={filters.minDiscount}
                    />

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
                      visibleListings.map((listing) => {
                        const selected = resolvedSelectedListing?.id === listing.id;

                        return (
                          <div
                            key={listing.id}
                            id={`listing-card-${listing.id}`}
                            onClick={() => {
                              setSelectedListing(listing);
                              if (isMobile) setMobilePanelOpen(false);
                            }}
                            className={`w-full rounded-2xl cursor-pointer transition-all duration-200 ${
                              selected
                                ? "ring-2 ring-red-500 shadow-lg scale-[1.01] bg-red-50/30"
                                : "hover:shadow-md"
                            }`}
                          >
                            <ListingCard listing={listing} isSelected={selected} />
                          </div>
                        );
                      })}

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
        )}
      </div>

      <div className="flex-1 h-full bg-gray-100 relative">
        {activeTab === "list" ? (
          <KakaoMap
            listings={visibleListings}
            selectedId={resolvedSelectedListing?.id ?? null}
            selectedListing={resolvedSelectedListing}
            onSelectListing={handleMapSelect}
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
