  // A가 Render 배포 완료되면 아래 URL을 실제 주소로 교체
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// 매물 목록 조회 (A 담당 엔드포인트)
export async function fetchListings({ region, type } = {}) {
  const params = new URLSearchParams();
  if (region && region !== "전체") params.append("region", region);
  if (type && type !== "전체") params.append("type", type);

  const res = await fetch(`${API_BASE_URL}/listings?${params}`);
  if (!res.ok) throw new Error("매물 조회 실패");
  return res.json();
}

// 급매 필터링 조회 (B 담당 엔드포인트)
export async function fetchFilter({ region, grade, minDiscount } = {}) {
  const params = new URLSearchParams();
  if (region && region !== "전체") params.append("region", region);
  if (grade && grade !== "전체") params.append("grade", grade);
  if (minDiscount) params.append("min_discount", minDiscount);

  const res = await fetch(`${API_BASE_URL}/filter?${params}`);
  if (!res.ok) throw new Error("필터링 조회 실패");
  return res.json();
}

// 이메일 알림 구독 (B 담당)
export async function subscribeAlert({ email, region, minDiscount }) {
  const res = await fetch(`${API_BASE_URL}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, region, min_discount: minDiscount }),
  });
  if (!res.ok) throw new Error("구독 실패");
  return res.json();
}

