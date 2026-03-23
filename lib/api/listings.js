import { apiGet } from "./client";

export async function fetchListings({ region, grade, minDiscount, page = 1, perPage = 20 }) {
  return apiGet("/filter", {
    region,
    grade,
    min_discount: minDiscount,
    page,
    per_page: perPage,
  });
}
