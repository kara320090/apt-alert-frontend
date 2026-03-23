// lib/api.js

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// 지역명 → 시군구 코드 매핑
const REGION_CODE_MAP = {
  "강남구": "11680",
  "서초구": "11650",
  "마포구": "11440",
  "송파구": "11710",
  "노원구": "11350",
};

// 매물 목록 조회
export async function fetchListings({ region, type } = {}) {
  const params = new URLSearchParams();
  const regionCode = REGION_CODE_MAP[region];
  if (region && region !== "전체" && regionCode) params.append("region_code", regionCode);
  if (type && type !== "전체") params.append("type", type);

  const res = await fetch(`${API_BASE_URL}/listings?${params}`);
  if (!res.ok) throw new Error("매물 조회 실패");
  return res.json();
}

// 급매 필터링 조회
export async function fetchFilter({ region, grade, minDiscount } = {}) {
  const params = new URLSearchParams();
  const regionCode = REGION_CODE_MAP[region];
  if (region && region !== "전체" && regionCode) params.append("region_code", regionCode);
  if (grade && grade !== "전체") params.append("grade", grade);
  if (minDiscount) params.append("min_discount", minDiscount);

  const res = await fetch(`${API_BASE_URL}/filter?${params}`);
  if (!res.ok) throw new Error("필터링 조회 실패");
  return res.json();
}

// 이메일 알림 구독
export async function subscribeAlert({ email, region, minDiscount }) {
  const res = await fetch(`${API_BASE_URL}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, region, min_discount: minDiscount }),
  });
  if (!res.ok) throw new Error("구독 실패");
  return res.json();
}

// 현재 페이지 매물 AI 태그/요약
export async function fetchAiListingTags(listings) {
  const res = await fetch("/api/ai/listing-tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listings }),
  });

  if (!res.ok) throw new Error("AI 태그 생성 실패");
  return res.json();
}