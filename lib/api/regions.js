import { apiGet } from "./client";

export async function fetchRegions() {
  return apiGet("/regions");
}
