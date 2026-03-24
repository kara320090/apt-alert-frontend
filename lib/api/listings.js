import { apiGet } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchFilteredListings({
  region,
  grade,
  minDiscount,
  page = 1,
  perPage = 20,
}) {
  const params = new URLSearchParams();

  if (region && region !== "전체") params.set("region", region);
  if (grade && grade !== "전체") params.set("grade", grade);
  if (minDiscount != null) params.set("min_discount", String(minDiscount));
  params.set("page", String(page));
  params.set("per_page", String(perPage));

  return apiGet(`${API_BASE_URL}/filter?${params.toString()}`);
}