// lib/api.js

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function parseJson(res) {
  let data = null;

  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new Error(`요청 실패 (${res.status})`);
    }
    return null;
  }

  if (!res.ok) {
    let detail =
      data?.detail ??
      data?.error?.message ??
      data?.error ??
      data?.message ??
      null;

    if (Array.isArray(detail)) {
      detail = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item?.msg) {
            const loc = Array.isArray(item.loc) ? item.loc.join(" > ") : "";
            return loc ? `${loc}: ${item.msg}` : item.msg;
          }
          try {
            return JSON.stringify(item);
          } catch {
            return String(item);
          }
        })
        .join(" | ");
    } else if (typeof detail === "object" && detail !== null) {
      try {
        detail = JSON.stringify(detail);
      } catch {
        detail = String(detail);
      }
    }

    throw new Error(detail || `요청 실패 (${res.status})`);
  }

  return data;
}

// 지역 목록 조회
export async function fetchRegions() {
  const res = await fetch(`${API_BASE_URL}/regions`, {
    cache: "no-store",
  });
  return parseJson(res);
}

// 매물 목록 조회 (기본 목록용)
export async function fetchListings({
  region,
  regionCode,
  dong,
  minArea,
  maxArea,
  page = 1,
  perPage = 20,
} = {}) {
  const params = new URLSearchParams();

  if (region && region !== "전체") params.append("region", region);
  if (regionCode) params.append("region_code", regionCode);
  if (dong) params.append("dong", dong);
  if (minArea != null) params.append("min_area", String(minArea));
  if (maxArea != null) params.append("max_area", String(maxArea));
  params.append("page", String(page));
  params.append("per_page", String(perPage));

  const res = await fetch(`${API_BASE_URL}/listings?${params.toString()}`, {
    cache: "no-store",
  });
  return parseJson(res);
}

// 급매 필터링 조회
export async function fetchFilter({
  region,
  regionCode,
  dong,
  grade,
  minDiscount,
  minArea,
  maxArea,
  page = 1,
  perPage = 20,
} = {}) {
  const params = new URLSearchParams();

  if (region && region !== "전체") params.append("region", region);
  if (regionCode) params.append("region_code", regionCode);
  if (dong) params.append("dong", dong);
  if (grade && grade !== "전체") params.append("grade", grade);
  if (minDiscount != null) params.append("min_discount", String(minDiscount));
  if (minArea != null) params.append("min_area", String(minArea));
  if (maxArea != null) params.append("max_area", String(maxArea));
  params.append("page", String(page));
  params.append("per_page", String(perPage));

  const res = await fetch(`${API_BASE_URL}/filter?${params.toString()}`, {
    cache: "no-store",
  });
  return parseJson(res);
}

// 이메일 알림 구독
export async function subscribeAlert({ email, region, grade = "전체", minDiscount }) {
  const res = await fetch(`${API_BASE_URL}/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      region,
      grade,
      min_discount: minDiscount,
    }),
  });

  return parseJson(res);
}

// 현재 페이지 매물 AI 태그/요약
export async function fetchAiListingTags(listings) {
  const res = await fetch("/api/ai/listing-tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ listings }),
  });

  return parseJson(res);
}