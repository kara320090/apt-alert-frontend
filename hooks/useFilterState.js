"use client";

import { useEffect, useState } from "react";
import { DEFAULT_FILTERS } from "@/lib/constants/defaults";

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function useFilterState() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const savedAi = localStorage.getItem("apt-alert-ai-enabled");

    setFilters((prev) => ({
      ...prev,
      region: params.get("region") || prev.region,
      grade: params.get("grade") || prev.grade,
      minDiscount: toNumber(params.get("minDiscount"), prev.minDiscount),
      page: toNumber(params.get("page"), prev.page),
      perPage: toNumber(params.get("perPage"), prev.perPage),
      aiEnabled: savedAi === "true" ? true : prev.aiEnabled,
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem("apt-alert-ai-enabled", String(filters.aiEnabled));

    const params = new URLSearchParams();
    params.set("region", filters.region);
    params.set("grade", filters.grade);
    params.set("minDiscount", String(filters.minDiscount));
    params.set("page", String(filters.page));
    params.set("perPage", String(filters.perPage));
    params.set("ai", filters.aiEnabled ? "1" : "0");

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextUrl);
  }, [filters]);

  function updateFilters(next) {
    setFilters((prev) => ({
      ...prev,
      ...next,
    }));
  }

  return {
    filters,
    setFilters: updateFilters,
  };
}
