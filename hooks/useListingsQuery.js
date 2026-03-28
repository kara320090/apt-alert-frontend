"use client";

import { useEffect, useState } from "react";
import { dummyListings } from "@/data/dummy";
import { enrichListings, applyFilter } from "@/lib/filter";
import { fetchListings } from "@/lib/api";

function mapBackendItem(item) {
  return {
    id: item.id,
    apt_seq: item.apt_seq ?? item.properties?.apt_seq ?? null,
    apt_name: item.apt_name ?? item.properties?.apt_name ?? "",
    area_size: Number(item.area_size ?? item.properties?.area_size ?? 0),
    region_code: item.region_code ?? item.properties?.region_code ?? null,
    region_name:
      item.region_name ??
      item.properties?.region_name ??
      item.dong_name ??
      item.properties?.dong_name ??
      item.properties?.dong ??
      "",
    dong_name: item.dong_name ?? item.properties?.dong_name ?? item.properties?.dong ?? "",
    price: Number(item.price ?? 0),
    floor: Number(item.floor ?? 0),
    deal_year: Number(item.deal_year ?? String(item.deal_date || "").split("-")[0] ?? 0),
    deal_month: Number(item.deal_month ?? String(item.deal_date || "").split("-")[1] ?? 0),
    cdeal_type: item.is_cancelled ? "Y" : "",
    market_avg: Number(item.market_avg ?? 0),
    discount_rate: Number(item.discount_rate ?? 0),
    grade: item.grade ?? "일반",
    lat: item.lat ?? null,
    lng: item.lng ?? null,
  };
}

export function useListingsQuery(filters) {
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL);

        if (hasApi) {
          const json = await fetchListings({
            region: filters.region,
            grade: filters.grade,
            minDiscount: filters.minDiscount,
            page: filters.page,
            perPage: filters.perPage,
          });

          if (!ignore) {
            setListings((json.data || []).map(mapBackendItem));
            setPagination({
              page: Number(json.page ?? json.pagination?.page ?? filters.page),
              per_page: Number(json.per_page ?? json.pagination?.per_page ?? filters.perPage),
              total: Number(json.count ?? json.pagination?.total ?? 0),
              total_pages: Number(json.total_pages ?? json.pagination?.total_pages ?? 1),
            });
          }
        } else {
          const enriched = enrichListings(dummyListings);
          const filtered = applyFilter(enriched, {
            region: filters.region,
            grade: filters.grade,
            minDiscount: filters.minDiscount,
          });

          const start = (filters.page - 1) * filters.perPage;
          const end = start + filters.perPage;
          const sliced = filtered.slice(start, end);

          if (!ignore) {
            setListings(sliced);
            setPagination({
              page: filters.page,
              per_page: filters.perPage,
              total: filtered.length,
              total_pages: Math.max(1, Math.ceil(filtered.length / filters.perPage)),
            });
          }
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setError("데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [filters.region, filters.grade, filters.minDiscount, filters.page, filters.perPage]);

  return {
    listings,
    pagination,
    loading,
    error,
  };
}
