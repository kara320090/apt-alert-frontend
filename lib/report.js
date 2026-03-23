function monthKey(item) {
  const y = Number(item.deal_year || 0);
  const m = Number(item.deal_month || 0);
  if (!y || !m) return "기타";
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function buildRegionReport(listings, selectedRegion = "전체") {
  const regionFiltered =
    selectedRegion === "전체"
      ? listings
      : listings.filter((item) => item.region_name === selectedRegion);

  const totalCount = regionFiltered.length;

  const avgDiscount =
    totalCount > 0
      ? (
          regionFiltered.reduce((sum, item) => sum + Number(item.discount_rate || 0), 0) /
          totalCount
        ).toFixed(1)
      : "0.0";

  const avgArea =
    totalCount > 0
      ? (
          regionFiltered.reduce((sum, item) => sum + Number(item.area_size || 0), 0) /
          totalCount
        ).toFixed(1)
      : "0.0";

  const avgFloor =
    totalCount > 0
      ? (
          regionFiltered.reduce((sum, item) => sum + Number(item.floor || 0), 0) /
          totalCount
        ).toFixed(1)
      : "0.0";

  const superUrgentCount = regionFiltered.filter((item) => item.grade === "초급매").length;
  const urgentRatio =
    totalCount > 0 ? ((superUrgentCount / totalCount) * 100).toFixed(1) : "0.0";

  const monthlyMap = new Map();

  for (const item of regionFiltered) {
    const key = monthKey(item);

    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        month: key,
        count: 0,
        discountSum: 0,
        superUrgentCount: 0,
      });
    }

    const row = monthlyMap.get(key);
    row.count += 1;
    row.discountSum += Number(item.discount_rate || 0);

    if (item.grade === "초급매") {
      row.superUrgentCount += 1;
    }
  }

  const monthlyTrend = Array.from(monthlyMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      month: row.month,
      count: row.count,
      avgDiscount: Number((row.discountSum / row.count).toFixed(1)),
      superUrgentRatio: Number(((row.superUrgentCount / row.count) * 100).toFixed(1)),
    }));

  return {
    selectedRegion,
    totalCount,
    avgDiscount: Number(avgDiscount),
    avgArea: Number(avgArea),
    avgFloor: Number(avgFloor),
    superUrgentCount,
    urgentRatio: Number(urgentRatio),
    monthlyTrend,
  };
}

export function buildRegionAiSummary(report) {
  const lines = [];

  if (report.totalCount === 0) {
    return "해당 지역에는 현재 분석 가능한 급매물 데이터가 없습니다.";
  }

  if (report.urgentRatio >= 40) {
    lines.push("초급매 비중이 높은 편이라 가격 메리트가 큰 지역으로 볼 수 있습니다.");
  } else if (report.urgentRatio >= 20) {
    lines.push("일정 수준 이상의 급매 기회가 존재하는 지역입니다.");
  } else {
    lines.push("극단적인 급매보다는 일반 급매 중심으로 형성된 지역입니다.");
  }

  if (report.avgDiscount >= 15) {
    lines.push("평균 할인율이 높아 가격 조정 폭이 비교적 크게 나타납니다.");
  } else if (report.avgDiscount >= 8) {
    lines.push("평균 할인율은 무난한 수준입니다.");
  } else {
    lines.push("가격 할인 폭은 비교적 제한적인 편입니다.");
  }

  if (report.avgArea >= 84) {
    lines.push("대형 또는 실거주 선호 평형 비중이 높은 흐름으로 볼 수 있습니다.");
  } else if (report.avgArea >= 59) {
    lines.push("중형 위주의 수요 친화적인 구조가 나타납니다.");
  } else {
    lines.push("소형 중심 흐름이 강한 지역입니다.");
  }

  const recent = report.monthlyTrend.slice(-2);
  if (recent.length === 2) {
    const [prev, curr] = recent;

    if (curr.count > prev.count) {
      lines.push("최근 월 기준 급매물 수가 증가하는 흐름입니다.");
    } else if (curr.count < prev.count) {
      lines.push("최근 월 기준 급매물 수는 다소 줄어드는 흐름입니다.");
    }

    if (curr.avgDiscount > prev.avgDiscount) {
      lines.push("최근 할인율도 확대되는 방향입니다.");
    } else if (curr.avgDiscount < prev.avgDiscount) {
      lines.push("최근 할인율은 다소 안정되는 방향입니다.");
    }
  }

  return lines.join(" ");
}