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
// 자기 자신은 제외하고, 조건을 단계적으로 완화
export function calcMarketAvg(trades, currentTrade) {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  const sameRegionCode = currentTrade.region_code;
  const sameAptSeq = currentTrade.apt_seq;
  const sameArea = Number(currentTrade.area_size || 0);
  const currentId = currentTrade.id;

  const validTrades = trades.filter((t) => {
    if (t.id === currentId) return false; // 자기 자신 제외
    if (t.is_cancelled) return false; // 해제 거래 제외 (API 데이터)
    if (t.cdeal_type && String(t.cdeal_type).trim() !== "") return false; // 해제 거래 제외 (더미 데이터)
    if (!t.price || Number(t.price) <= 0) return false;
    return true;
  });

  // 1순위: 같은 단지 + 면적 ±5 + 최근 6개월
  let filtered = validTrades.filter((t) => {
    const tradeDate = toTradeDate(t);
    if (!tradeDate) return false;

    return (
      t.apt_seq === sameAptSeq &&
      Math.abs(Number(t.area_size || 0) - sameArea) <= 5 &&
      tradeDate >= sixMonthsAgo
    );
  });

  // 2순위: 같은 단지 + 면적 ±10 + 최근 12개월
  if (filtered.length < 2) {
    filtered = validTrades.filter((t) => {
      const tradeDate = toTradeDate(t);
      if (!tradeDate) return false;

      return (
        t.apt_seq === sameAptSeq &&
        Math.abs(Number(t.area_size || 0) - sameArea) <= 10 &&
        tradeDate >= oneYearAgo
      );
    });
  }

  // 3순위: 같은 지역 + 면적 ±10 + 최근 12개월
  if (filtered.length < 2) {
    filtered = validTrades.filter((t) => {
      const tradeDate = toTradeDate(t);
      if (!tradeDate) return false;

      return (
        t.region_code === sameRegionCode &&
        Math.abs(Number(t.area_size || 0) - sameArea) <= 10 &&
        tradeDate >= oneYearAgo
      );
    });
  }

  // 4순위: 같은 지역 + 면적 ±15
  if (filtered.length < 2) {
    filtered = validTrades.filter((t) => {
      return (
        t.region_code === sameRegionCode &&
        Math.abs(Number(t.area_size || 0) - sameArea) <= 15
      );
    });
  }

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