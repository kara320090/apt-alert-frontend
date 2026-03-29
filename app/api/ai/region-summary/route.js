import { buildRegionAiSummary } from "../../../../lib/report";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function normalizeSummary(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  return value;
}

async function callGemini(report, selectedRegion) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent`
  );
  url.searchParams.set("key", GEMINI_API_KEY);

  const prompt = [
    "너는 부동산 급매 데이터 요약 도우미다.",
    "아래 지표를 보고 한국어로 2~3문장만 작성하라.",
    "숫자 근거를 최소 2개 포함하고, 과장 표현은 금지한다.",
    "존댓말 대신 보고서 톤으로 간결하게 작성한다.",
    "출력은 순수 텍스트만 반환한다.",
    "",
    `[지역] ${selectedRegion || "전체"}`,
    `[총 매물] ${Number(report?.totalCount || 0)}건`,
    `[평균 할인율] ${Number(report?.avgDiscount || 0)}%`,
    `[초급매 비중] ${Number(report?.urgentRatio || 0)}%`,
    `[평균 면적] ${Number(report?.avgArea || 0)}㎡`,
    `[평균 층수] ${Number(report?.avgFloor || 0)}층`,
    `[월별 추이] ${JSON.stringify(report?.monthlyTrend || [])}`,
  ].join("\n");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 220,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const json = await res.json();
  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("\n") || "";

  const summary = normalizeSummary(text);
  if (!summary) {
    throw new Error("Gemini returned empty summary");
  }

  return summary;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const report = body?.report || {};
    const selectedRegion = body?.selectedRegion || "전체";

    const fallback = buildRegionAiSummary(report);

    if (Number(report?.totalCount || 0) <= 0) {
      return Response.json({
        summary: fallback,
        provider: "rule",
        model: "local-rule",
      });
    }

    try {
      const summary = await callGemini(report, selectedRegion);
      return Response.json({
        summary,
        provider: "gemini",
        model: GEMINI_MODEL,
      });
    } catch {
      return Response.json({
        summary: fallback,
        provider: "rule",
        model: "local-rule",
      });
    }
  } catch {
    return Response.json(
      { error: "AI 지역 요약 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}