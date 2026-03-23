import { API_BASE_URL } from "./api/client";
import { fetchListings as fetchListingsV2 } from "./api/listings";
import { fetchRegions as fetchRegionsV2 } from "./api/regions";
import { createSubscription as createSubscriptionV2 } from "./api/subscriptions";
import { fetchAiListingTags as fetchAiListingTagsV2 } from "./api/ai";

export { API_BASE_URL };

export async function fetchListings(params = {}) {
  return fetchListingsV2(params);
}

export async function fetchFilter({ region, grade, minDiscount, page = 1, perPage = 20 } = {}) {
  return fetchListingsV2({ region, grade, minDiscount, page, perPage });
}

export async function fetchRegions() {
  return fetchRegionsV2();
}

export async function subscribeAlert({ email, region, grade = "전체", minDiscount }) {
  return createSubscriptionV2({ email, region, grade, minDiscount });
}

export async function fetchAiListingTags(listings) {
  return fetchAiListingTagsV2(listings);
}
