// lib/filter.js

// 급매 등급 분류
export function classifyGrade(discountRate) {
  if (discountRate >= 20) return "초급매";
  if (discountRate >= 13) return "급매";
  if (discountRate >= 5) return "저평가";
  return "일반";
}

// 할인율 계산
export function calcDiscountRate(price, marketAvg) {
  if (!marketAvg || marketAvg <= 0) return 0;
  return Math.round((1 - price / marketAvg) * 100 * 10) / 10;
}

// 날짜 파싱
function toTradeDate(trade) {
  if (trade.deal_date) {
    return new Date(trade.deal_date);
  }

  if (trade.deal_year && trade.deal_month) {
    return new Date(trade.deal_year, trade.deal_month - 1, 1);
  }

  return null;
}

// 시세 평균 계산
// 기준: 같은 단지 + 비슷한 전용면적(±5) + 최근 12개월
export function calcMarketAvg(trades, currentTrade) {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  const sameAptSeq = currentTrade.apt_seq;
  const sameAptName = String(currentTrade.apt_name || "").trim();
  const sameArea = Number(currentTrade.area_size || 0);
  const currentId = currentTrade.id;

  const validTrades = trades.filter((t) => {
    if (t.id === currentId) return false; // 자기 자신 제외
    if (t.is_cancelled) return false; // 해제 거래 제외 (API 데이터)
    if (t.cdeal_type && String(t.cdeal_type).trim() !== "") return false; // 해제 거래 제외 (더미 데이터)
    if (!t.price || Number(t.price) <= 0) return false;
    return true;
  });

  const filtered = validTrades.filter((t) => {
    const tradeDate = toTradeDate(t);
    if (!tradeDate) return false;

    const targetAptSeq = t.apt_seq;
    const targetAptName = String(t.apt_name || "").trim();
    const aptMatch = sameAptSeq
      ? targetAptSeq === sameAptSeq
      : sameAptName && targetAptName === sameAptName;

    if (!aptMatch) return false;

    return (
      Math.abs(Number(t.area_size || 0) - sameArea) <= 5 &&
      tradeDate >= oneYearAgo
    );
  });

  if (filtered.length === 0) return null;

  const total = filtered.reduce((sum, t) => sum + Number(t.price || 0), 0);
  return Math.round(total / filtered.length);
}

// API/더미 데이터 공통으로 급매 정보 추가
export function enrichListings(trades) {
  const enriched = trades
    .map((trade) => {
      const marketAvg = calcMarketAvg(trades, trade);
      if (!marketAvg) return null;

      const discountRate = calcDiscountRate(Number(trade.price || 0), marketAvg);
      const grade = classifyGrade(discountRate);

      return {
        ...trade,
        market_avg: marketAvg,
        discount_rate: discountRate,
        grade,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.discount_rate - a.discount_rate);

  return enriched;
}

// 필터 적용
export function applyFilter(listings, { region, grade, minDiscount }) {
  return listings.filter((item) => {
    const regionMatch =
      !region || region === "전체" || item.region_name === region;

    const gradeMatch =
      !grade || grade === "전체" || item.grade === grade;

    const discountMatch =
      item.discount_rate >= (minDiscount ?? 0);

    return regionMatch && gradeMatch && discountMatch;
  });
}