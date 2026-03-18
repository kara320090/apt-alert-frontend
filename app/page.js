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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        let mapped;

        if (API_URL) {
          const res = await fetch(`${API_URL}/listings`, {
            cache: "no-store",
          });

          if (!res.ok) {
            throw new Error("API 호출 실패");
          }

          const json = await res.json();

          // API 응답 안전 처리
          const items = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];

          mapped = items.map((item, index) => ({
            id: item.id ?? `${item.deal_date ?? "no-date"}-${index}`,
            apt_seq:
              item.properties?.apt_seq ??
              item.apt_seq ??
              "",
            apt_name:
              item.properties?.apt_name ??
              item.properties?.aptNm ??
              item.apt_name ??
              item.aptNm ??
              "이름없음",
            area_size: Number(
              item.properties?.area_size ??
              item.properties?.excluUseAr ??
              item.area_size ??
              item.excluUseAr ??
              0
            ),
            region_code:
              item.properties?.region_code ??
              item.properties?.sggCd ??
              item.region_code ??
              item.sggCd ??
              "",
            region_name:
              item.properties?.dong ??
              item.properties?.umdNm ??
              item.region_name ??
              item.umdNm ??
              "지역정보없음",
            price: Number(item.price ?? item.dealAmount ?? 0),
            floor: Number(item.floor ?? 0),
            deal_date:
              item.deal_date ??
              `${item.deal_year ?? item.dealYear ?? 2026}-${String(
                item.deal_month ?? item.dealMonth ?? 1
              ).padStart(2, "0")}-01`,
            deal_year: Number(
              item.deal_year ??
              item.dealYear ??
              (item.deal_date ? item.deal_date.split("-")[0] : 0)
            ),
            deal_month: Number(
              item.deal_month ??
              item.dealMonth ??
              (item.deal_date ? item.deal_date.split("-")[1] : 0)
            ),
            cdeal_type:
              item.cdeal_type ??
              item.cdealType ??
              (item.is_cancelled ? "Y" : ""),
          }));

          const enriched = enrichListings(mapped);

          setAllListings(enriched);
          // 초기에는 최소 할인율 0 기준으로 전체 보여주기
          setFiltered(enriched);
        } else {
          mapped = dummyListings.map((item) => ({
            ...item,
            apt_seq: item.apt_seq ?? `dummy-${item.id}`,
            area_size: Number(item.area_size ?? item.area ?? 0),
            region_code: item.region_code ?? item.region_name ?? "",
            deal_date:
              item.deal_date ??
              `${item.deal_year}-${String(item.deal_month).padStart(2, "0")}-01`,
            cdeal_type: item.cdeal_type ?? "",
          }));

          const enriched = enrichListings(mapped);
          setAllListings(enriched);
          setFiltered(enriched);
        }
      } catch (err) {
        console.error(err);
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
      minDiscount: maxDiscount ?? 0,
    });
    setFiltered(result);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">급매물 알리미</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          실거래가 기반 급매물 자동 감지 서비스
        </p>

        {!API_URL && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mt-1 inline-block">
            더미 데이터 모드
          </span>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <FilterBar onFilter={handleFilter} />

        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">
            급매물 불러오는 중...
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {filtered.length}건의 매물
            </p>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400 text-sm">
                조건에 맞는 매물이 없습니다
              </div>
            )}
          </>
        )}

        <EmailForm />
      </div>
    </main>
  );
}