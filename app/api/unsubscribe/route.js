export async function POST(req) {
  try {
    const body = await req.json();

    const baseUrl = process.env.EMAIL_API_BASE_URL;
    if (!baseUrl) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: "EMAIL_API_BASE_URL is not set",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const res = await fetch(`${baseUrl}/unsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        ok: false,
        message: text || "Invalid response from email backend",
      };
    }

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: `unsubscribe proxy failed: ${err.message}`,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}