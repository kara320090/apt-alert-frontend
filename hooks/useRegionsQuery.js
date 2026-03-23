"use client";

import { useEffect, useState } from "react";
import { fetchRegions } from "@/lib/api/regions";
import { REGION_FALLBACK } from "@/lib/constants/regions";

export function useRegionsQuery() {
  const [regions, setRegions] = useState(REGION_FALLBACK);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const json = await fetchRegions();
        const names = Array.isArray(json?.data)
          ? json.data.filter((item) => typeof item === "string")
          : [];
        const itemNames = Array.isArray(json?.items)
          ? json.items.map((item) => item?.name).filter(Boolean)
          : [];
        const merged = names.length > 0 ? names : itemNames;
        if (!ignore && merged.length > 0) {
          setRegions(merged);
        }
      } catch (error) {
        console.error("regions load failed:", error);
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
  }, []);

  return { regions, loading };
}
