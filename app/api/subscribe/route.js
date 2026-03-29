const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

export async function POST(request) {
  try {
    const payload = await request.json();

    if (!API_URL) {
      return Response.json(
        { error: "API_URL 환경변수가 없습니다." },
        { status: 500 }
      );
    }

    const res = await fetch(`${API_URL.replace(/\/$/, "")}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json(
        { error: data?.detail || data?.error || "구독 처리 중 오류가 발생했어요." },
        { status: res.status }
      );
    }

    return Response.json(data);
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "구독 처리 중 오류가 발생했어요." },
      { status: 500 }
    );
  }
}
