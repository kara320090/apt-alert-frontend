// lib/aiSummary.js

function uniqueTags(tags) {
  return [...new Set((tags || []).filter(Boolean))];
}

function formatEok(price) {
  const value = Number(price || 0);
  const uk = Math.floor(value / 10000);
  const man = value % 10000;

  if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}만`;
  if (uk > 0) return `${uk}억`;
  return `${value.toLocaleString()}만`;
}

export function buildPriceAiMeta(listing) {
  const tags = [];

  const discount = Number(listing.discount_rate || 0);
  const floor = Number(listing.floor || 0);
  const area = Number(listing.area_size || 0);
  const price = Number(listing.price || 0);
  const marketAvg = Number(listing.market_avg || 0);

  if (listing.grade === "초급매") tags.push("강한 가격 메리트");
  else if (listing.grade === "급매") tags.push("가격 경쟁력");
  else if (listing.grade === "저평가") tags.push("저평가 후보");

  if (discount >= 20) tags.push("시세 대비 큰 할인");
  else if (discount >= 10) tags.push("할인 폭 양호");

  if (floor >= 20) tags.push("고층");
  else if (floor >= 10) tags.push("중상층");
  else if (floor > 0) tags.push("저층~중층");

  if (area >= 84) tags.push("실거주 선호 면적");
  else if (area >= 59) tags.push("수요 많은 중형");
  else if (area > 0) tags.push("소형 면적");

  let summary = "";

  if (discount >= 20 && area >= 84) {
    summary = `시세 대비 할인 폭이 큰 ${area}㎡ 실거주형 급매물입니다.`;
  } else if (discount >= 20) {
    summary = `가격 메리트가 뚜렷한 급매물입니다.`;
  } else if (discount >= 13 && floor >= 15) {
    summary = `가격 경쟁력과 층수 조건을 함께 갖춘 매물입니다.`;
  } else if (area >= 84 && floor >= 10) {
    summary = `넉넉한 면적과 무난한 층수를 갖춘 실거주형 매물입니다.`;
  } else if (discount >= 5) {
    summary = `시세보다 낮은 가격대로 검토할 만한 매물입니다.`;
  } else {
    summary = `기본 조건을 갖춘 일반 매물입니다.`;
  }

  if (marketAvg > 0) {
    summary += ` 현재 호가는 ${formatEok(price)}, 비교 시세는 ${formatEok(marketAvg)} 수준입니다.`;
  }

  return {
    ai_tags: uniqueTags(tags).slice(0, 4),
    ai_summary: summary,
  };
}

export function mergeAiMeta(listing, locationMeta = {}) {
  const priceMeta = buildPriceAiMeta(listing);

  const mergedTags = uniqueTags([
    ...(priceMeta.ai_tags || []),
    ...(locationMeta.ai_tags || []),
  ]).slice(0, 8);

  const mergedSummary = [priceMeta.ai_summary, locationMeta.ai_summary]
    .filter(Boolean)
    .join(" ");

  return {
    ...listing,
    ai_tags: mergedTags,
    ai_summary: mergedSummary,
    ai_location_meta: locationMeta.ai_location_meta || null,
  };
}

export function enrichWithPriceAiOnly(listings, aiEnabled) {
  if (!aiEnabled) {
    return listings.map((item) => ({
      ...item,
      ai_tags: [],
      ai_summary: "",
      ai_location_meta: null,
    }));
  }

  return listings.map((item) => mergeAiMeta(item));
}