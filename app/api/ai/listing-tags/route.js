// app/api/ai/listing-tags/route.js

import { mergeAiMeta } from "../../../../lib/aiSummary";

export const runtime = "nodejs";

const REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const locationCache = new Map();
const LOCATION_CACHE_MAX = 500;
const LISTING_ENRICH_CONCURRENCY = 4;
const CATEGORY_SEARCH_CONCURRENCY = 4;

function getLocationCache(key) {
  if (!locationCache.has(key)) return undefined;
  const value = locationCache.get(key);
  locationCache.delete(key);
  locationCache.set(key, value);
  return value;
}

function setLocationCache(key, value) {
  if (locationCache.has(key)) {
    locationCache.delete(key);
  }
  while (locationCache.size >= LOCATION_CACHE_MAX) {
    const oldestKey = locationCache.keys().next().value;
    if (oldestKey === undefined) break;
    locationCache.delete(oldestKey);
  }
  locationCache.set(key, value);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const safeConcurrency = Math.max(1, Math.min(Number(concurrency) || 1, items.length || 1));
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: safeConcurrency }, () => worker()));
  return results;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()\[\].,]/g, "");
}

function scoreKeywordResult(result, aptName, regionName) {
  const aptNorm = normalizeText(aptName);
  const regionNorm = normalizeText(regionName);
  const placeNorm = normalizeText(result?.place_name);
  const addressNorm = normalizeText(result?.address_name || result?.road_address_name);

  let score = 0;
  if (aptNorm && placeNorm.includes(aptNorm)) score += 3;
  if (regionNorm && (addressNorm.includes(regionNorm) || placeNorm.includes(regionNorm))) score += 2;

  const category = String(result?.category_name || "").toLowerCase();
  if (category.includes("부동산") || category.includes("중개")) score -= 2;
  if (category.includes("아파트") || category.includes("주거")) score += 1;

  return score;
}

function pickBestKeywordResult(results, aptName, regionName) {
  const list = Array.isArray(results) ? results : [];
  if (list.length === 0) return null;

  let best = null;
  let bestScore = -Infinity;

  list.forEach((result) => {
    const score = scoreKeywordResult(result, aptName, regionName);
    if (score > bestScore) {
      best = result;
      bestScore = score;
    }
  });

  if (!best || bestScore < 2) {
    return null;
  }

  return best;
}

function uniqueTags(tags) {
  return [...new Set((tags || []).filter(Boolean))];
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function estimateWalkMinutes(distance) {
  if (distance == null) return null;
  return Math.max(1, Math.round(distance / 80));
}

async function kakaoLocalFetch(path, params = {}) {
  if (!REST_API_KEY) {
    throw new Error("KAKAO_REST_API_KEY is missing");
  }

  const url = new URL(`https://dapi.kakao.com${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `KakaoAK ${REST_API_KEY}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Kakao Local API error: ${res.status}`);
    }

    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function findApartmentBase(listing) {
  const cacheKey = `base:${listing.region_name || ""}:${listing.apt_name || ""}`;

  const cached = getLocationCache(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const queries = [
    `${listing.region_name || ""} ${listing.apt_name || ""}`.trim(),
    `${listing.apt_name || ""}`.trim(),
  ].filter(Boolean);

  for (const query of queries) {
    const json = await kakaoLocalFetch("/v2/local/search/keyword.json", {
      query,
      size: 5,
    });

    const docs = Array.isArray(json.documents) ? json.documents : [];
    if (docs.length === 0) continue;

    const matched = pickBestKeywordResult(docs, listing.apt_name, listing.region_name);
    if (!matched) continue;

    const base = {
      x: toNumber(matched.x),
      y: toNumber(matched.y),
      place_name: matched.place_name || "",
      address_name: matched.address_name || "",
      road_address_name: matched.road_address_name || "",
    };

    setLocationCache(cacheKey, base);
    return base;
  }

  setLocationCache(cacheKey, null);
  return null;
}

async function searchCategory({ x, y, categoryCode, radius = 700, size = 15 }) {
  const json = await kakaoLocalFetch("/v2/local/search/category.json", {
    category_group_code: categoryCode,
    x,
    y,
    radius,
    sort: "distance",
    size,
  });

  const docs = Array.isArray(json.documents) ? json.documents : [];
  const nearestDistance =
    docs.length > 0 && docs[0].distance !== ""
      ? toNumber(docs[0].distance)
      : null;

  return {
    count: Number(json.meta?.total_count || docs.length || 0),
    nearestDistance,
  };
}

async function safeSearchCategory(params) {
  try {
    return await searchCategory(params);
  } catch {
    return {
      count: 0,
      nearestDistance: null,
    };
  }
}

function buildLocationMeta(metrics) {
  const tags = [];
  const summaryBits = [];

  if (metrics.subway.nearestDistance != null) {
    if (metrics.subway.nearestDistance <= 300) {
      tags.push("초역세권");
      summaryBits.push(
        `지하철역 ${metrics.subway.nearestDistance}m(도보 약 ${estimateWalkMinutes(
          metrics.subway.nearestDistance
        )}분)`
      );
    } else if (metrics.subway.nearestDistance <= 500) {
      tags.push("역세권");
      summaryBits.push(`지하철역 ${metrics.subway.nearestDistance}m`);
    }
  }

  if (
    metrics.school.count > 0 &&
    metrics.school.nearestDistance != null &&
    metrics.school.nearestDistance <= 700
  ) {
    tags.push("학교 가까움");
  }

  if (
    metrics.daycare.count > 0 &&
    metrics.daycare.nearestDistance != null &&
    metrics.daycare.nearestDistance <= 700
  ) {
    tags.push("육아 인프라");
  }

  if (
    metrics.hagwon.count >= 3 &&
    (metrics.hagwon.nearestDistance ?? 9999) <= 900
  ) {
    tags.push("학원가 접근");
  }

  if (
    metrics.hospital.count > 0 &&
    (metrics.hospital.nearestDistance ?? 9999) <= 700
  ) {
    tags.push("병원 접근 좋음");
  }

  if (
    metrics.pharmacy.count > 0 &&
    (metrics.pharmacy.nearestDistance ?? 9999) <= 400
  ) {
    tags.push("약국 가까움");
  }

  const convenienceScore =
    metrics.convenience.count + metrics.market.count + metrics.pharmacy.count;

  if (convenienceScore >= 8) {
    tags.push("생활편의 우수");
    summaryBits.push(`생활편의시설 ${convenienceScore}곳 이상`);
  } else if (convenienceScore >= 4) {
    tags.push("생활편의 양호");
  }

  const commercialScore = metrics.cafe.count + metrics.restaurant.count;
  if (commercialScore >= 12) {
    tags.push("상권 활성");
  }

  if (metrics.cafe.count >= 6) {
    tags.push("카페 인접");
  }

  return {
    ai_tags: uniqueTags(tags).slice(0, 6),
    ai_summary:
      summaryBits.length > 0
        ? `입지 기준으로 ${summaryBits.slice(0, 2).join(", ")} 수준입니다.`
        : "",
  };
}

async function buildLocationMetaForListing(listing) {
  if (!REST_API_KEY) {
    return {
      ai_tags: [],
      ai_summary: "",
      ai_location_meta: null,
    };
  }

  const cacheKey = `meta:${listing.region_name || ""}:${listing.apt_name || ""}`;
  const cached = getLocationCache(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const base = await findApartmentBase(listing);

  if (!base?.x || !base?.y) {
    const empty = {
      ai_tags: [],
      ai_summary: "",
      ai_location_meta: null,
    };
    setLocationCache(cacheKey, empty);
    return empty;
  }

  const categoryQueries = [
    { key: "subway", categoryCode: "SW8", radius: 1200 },
    { key: "school", categoryCode: "SC4", radius: 1000 },
    { key: "daycare", categoryCode: "PS3", radius: 1000 },
    { key: "hagwon", categoryCode: "AC5", radius: 1200 },
    { key: "hospital", categoryCode: "HP8", radius: 1000 },
    { key: "pharmacy", categoryCode: "PM9", radius: 700 },
    { key: "convenience", categoryCode: "CS2", radius: 700 },
    { key: "market", categoryCode: "MT1", radius: 1000 },
    { key: "cafe", categoryCode: "CE7", radius: 700 },
    { key: "restaurant", categoryCode: "FD6", radius: 700 },
  ];

  const categoryResults = await mapWithConcurrency(
    categoryQueries,
    CATEGORY_SEARCH_CONCURRENCY,
    async (query) => ({
      key: query.key,
      value: await safeSearchCategory({
        x: base.x,
        y: base.y,
        categoryCode: query.categoryCode,
        radius: query.radius,
      }),
    })
  );

  const metrics = categoryResults.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  const locationMeta = {
    ...buildLocationMeta(metrics),
    ai_location_meta: {
      base,
      metrics,
    },
  };

  setLocationCache(cacheKey, locationMeta);
  return locationMeta;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const listings = Array.isArray(body?.listings) ? body.listings.slice(0, 20) : [];

    if (listings.length === 0) {
      return Response.json({ data: [] });
    }

    const enriched = await mapWithConcurrency(
      listings,
      LISTING_ENRICH_CONCURRENCY,
      async (listing) => {
        try {
          const locationMeta = await buildLocationMetaForListing(listing);
          return mergeAiMeta(listing, locationMeta);
        } catch (error) {
          return mergeAiMeta(listing);
        }
      }
    );

    return Response.json({ data: enriched });
  } catch (error) {
    return Response.json(
      { error: "AI 위치 태그 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}