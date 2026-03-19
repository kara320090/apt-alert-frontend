import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email, region, minDiscount } = await request.json();

    if (!email || !email.includes("@")) {
      return Response.json(
        { error: "올바른 이메일 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "급매물 알리미 <onboarding@resend.dev>",
      to: email,
      subject: "급매물 알림 구독 완료!",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1d4ed8;">급매물 알림 구독 완료!</h2>
          <p>아래 조건으로 급매물 알림을 설정했어요.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; background: #f1f5f9; font-weight: bold;">지역</td>
              <td style="padding: 8px; background: #f8fafc;">${region}</td>
            </tr>
            <tr>
              <td style="padding: 8px; background: #f1f5f9; font-weight: bold;">최소 할인율</td>
              <td style="padding: 8px; background: #f8fafc;">${minDiscount}% 이상</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">
            조건에 맞는 급매물이 나오면 바로 알려드릴게요!
          </p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: "구독 처리 중 오류가 발생했어요." },
      { status: 500 }
    );
  }
}