"use client";

import { useMemo } from "react";

export function usePagination(pagination) {
  return useMemo(() => {
    const page = pagination?.page || 1;
    const totalPages = pagination?.total_pages || 1;
    const total = pagination?.total || 0;
    const perPage = pagination?.per_page || 20;

    return {
      page,
      totalPages,
      total,
      perPage,
    };
  }, [pagination]);
}
