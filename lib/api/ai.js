export async function fetchAiListingTags(listings) {
  const res = await fetch("/api/ai/listing-tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ listings }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "AI 태그 생성 실패");
  }
  return data;
}
