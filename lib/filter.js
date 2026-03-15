/**
 * 급매 판별 로직
 * A가 Supabase에 저장한 실거래 데이터를 기반으로
 * 시세 평균을 계산하고 급매 등급을 분류합니다.
 */

// 급매 등급 분류
export function classifyGrade(discountRate) {
  if (discountRate >= 20) return "초급매";  // 시세의 80% 이하
  if (discountRate >= 13) return "급매";    // 시세의 87% 이하
  if (discountRate >= 5)  return "저평가";  // 시세의 95% 이하
  return "일반";
}

// 할인율 계산
export function calcDiscountRate(price, marketAvg) {
  if (!marketAvg || marketAvg === 0) return 0;
  return Math.round((1 - price / marketAvg) * 100 * 10) / 10;
}

// 시세 평균 계산 (같은 단지 + 같은 면적대 + 최근 6개월)
export function calcMarketAvg(trades, aptSeq, area) {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const filtered = trades.filter((t) => {
    // 같은 단지
    if (t.apt_seq !== aptSeq) return false;

    // 같은 면적대 (±5㎡)
    if (Math.abs(t.area_size - area) > 5) return false;

    // 최근 6개월
    const tradeDate = new Date(t.deal_year, t.deal_month - 1, 1);
    if (tradeDate < sixMonthsAgo) return false;

    // 해제된 거래 제외
    if (t.cdeal_type && t.cdeal_type.trim() !== "") return false;

    return true;
  });

  if (filtered.length === 0) return null;

  const total = filtered.reduce((sum, t) => sum + t.price, 0);
  return Math.round(total / filtered.length);
}

// 매물 리스트에 급매 정보 추가
export function enrichListings(trades) {
  return trades
    .map((trade) => {
      const marketAvg = calcMarketAvg(trades, trade.apt_seq, trade.area_size);
      if (!marketAvg) return null;

      const discountRate = calcDiscountRate(trade.price, marketAvg);
      const grade = classifyGrade(discountRate);

      return {
        ...trade,
        market_avg: marketAvg,
        discount_rate: discountRate,
        grade,
      };
    })
    .filter(Boolean)                          // null 제거
    .filter((t) => t.grade !== "일반")        // 일반 매물 제외
    .sort((a, b) => b.discount_rate - a.discount_rate); // 할인율 높은 순
}

// 필터 조건 적용
export function applyFilter(listings, { region, grade, minDiscount }) {
  return listings.filter((item) => {
    const regionMatch = !region || region === "전체" || item.region_name === region;
    const gradeMatch = !grade || grade === "전체" || item.grade === grade;
    const discountMatch = item.discount_rate >= minDiscount;
    return regionMatch && gradeMatch && discountMatch;
  });
}