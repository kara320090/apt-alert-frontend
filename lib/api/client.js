export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail || data?.error?.message || data?.error || data?.message;
    throw new Error(detail || `요청 실패 (${res.status})`);
  }
  return data;
}

export async function apiGet(path, params = {}) {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is missing");
  }

  const url = new URL(path, API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "전체") {
      url.searchParams.set(key, String(value));
    }
  });

  const res = await fetch(url.toString(), { cache: "no-store" });
  return parseJson(res);
}

export async function apiPost(path, body = {}) {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is missing");
  }

  const url = new URL(path, API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseJson(res);
}
