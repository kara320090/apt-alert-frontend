import { Resend } from "resend";
import { enrichListings, applyFilter } from "../../../lib/filter";

const resend = new Resend(process.env.RESEND_API_KEY);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request) {
  try {
    const { email, region, minDiscount } = await request.json();

    if (!email || !email.includes("@") || !email.includes(".")) {
      return Response.json(
        { error: "올바른 이메일 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    // 현재 급매물 조회
    let matchedListings = [];

    if (API_URL) {
      const res = await fetch(`${API_URL}/listings`);
      if (res.ok) {
        const json = await res.json();

        const raw = json.data.map((item) => ({
          id: item.id,
          apt_seq: item.properties.apt_seq,
          apt_name: item.properties.apt_name,
          area_size: item.properties.area_size,
          region_code: item.properties.region_code,
          region_name: item.properties.dong,
          price: item.price,
          floor: item.floor,
          deal_year: parseInt(item.deal_date.split("-")[0]),
          deal_month: parseInt(item.deal_date.split("-")[1]),
          cdeal_type: item.is_cancelled ? "Y" : "",
        }));

        const enriched = enrichListings(raw);
        matchedListings = applyFilter(enriched, {
          region,
          grade: "전체",
          minDiscount,
        });
      }
    }

    // 매물 목록 HTML 생성
    function formatPrice(price) {
      const uk = Math.floor(price / 10000);
      const man = price % 10000;
      if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}만`;
      if (uk > 0) return `${uk}억`;
      return `${price.toLocaleString()}만`;
    }

    const listingsHtml =
      matchedListings.length > 0
        ? matchedListings
            .slice(0, 10)
            .map(
              (l) => `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0;">
              <strong>${l.apt_name}</strong><br/>
              <span style="color:#64748b;font-size:12px;">${l.region_name} · ${l.area_size}㎡ · ${l.floor}층</span>
            </td>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;">
              <strong style="color:#dc2626;">-${l.discount_rate}%</strong><br/>
              <span style="font-size:13px;">${formatPrice(l.price)}</span><br/>
              <span style="color:#94a3b8;font-size:11px;">시세 ${formatPrice(l.market_avg)}</span>
            </td>
          </tr>
        `
            )
            .join("")
        : `<tr><td colspan="2" style="padding:16px;text-align:center;color:#94a3b8;">
            현재 조건에 맞는 급매물이 없어요
           </td></tr>`

    await resend.emails.send({
      from: "급매물 알리미 <onboarding@resend.dev>",
      to: email,
      subject:
        matchedListings.length > 0
          ? `🔥 급매물 ${matchedListings.length}건 발견!`
          : "급매물 알림 구독 완료",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#1d4ed8;">급매물 알리미</h2>

          <div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
            <p style="margin:0;font-size:13px;color:#475569;">
              📍 지역: <strong>${region}</strong> &nbsp;|&nbsp;
              📉 할인율: <strong>${minDiscount}% 이상</strong>
            </p>
          </div>

          ${
            matchedListings.length > 0
              ? `<p style="color:#dc2626;font-weight:bold;">
                  현재 조건에 맞는 급매물 ${matchedListings.length}건을 찾았어요!
                 </p>`
              : `<p style="color:#64748b;">
                  현재 조건에 맞는 급매물은 없지만, 새로운 급매물이 나오면 바로 알려드릴게요!
                 </p>`
          }

          <table style="width:100%;border-collapse:collapse;margin-top:8px;">
            ${listingsHtml}
          </table>

          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
            조건을 변경하려면 사이트에서 다시 구독 신청하시면 돼요.
          </p>
        </div>
      `,
    });

    return Response.json({ success: true, count: matchedListings.length });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "구독 처리 중 오류가 발생했어요." },
      { status: 500 }
    );
  }
}