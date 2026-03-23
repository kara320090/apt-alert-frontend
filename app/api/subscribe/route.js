export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, region, minDiscount } = body;

    if (!email || !email.includes("@") || !email.includes(".")) {
      return Response.json({ error: "유효하지 않은 이메일입니다." }, { status: 400 });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        email,
        region: region || "전체",
        min_discount: minDiscount || 5,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.code === "23505") {
        return Response.json({ message: "이미 구독 중인 이메일입니다." });
      }
      return Response.json({ error: "구독 저장 실패" }, { status: 500 });
    }

    return Response.json({ message: "구독이 완료되었습니다." });
  } catch {
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
