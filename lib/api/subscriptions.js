import { apiPost } from "./client";

export async function createSubscription({ email, region, grade = "전체", minDiscount }) {
  return apiPost("/subscriptions", {
    email,
    region,
    grade,
    min_discount: minDiscount,
  });
}
