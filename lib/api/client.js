async function parseJson(res) {
  let data = null;

  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new Error(`요청 실패 (${res.status})`);
    }
    return null;
  }

  if (!res.ok) {
    let detail =
      data?.detail ??
      data?.error?.message ??
      data?.error ??
      data?.message ??
      null;

    if (Array.isArray(detail)) {
      detail = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item?.msg) {
            const loc = Array.isArray(item.loc) ? item.loc.join(" > ") : "";
            return loc ? `${loc}: ${item.msg}` : item.msg;
          }
          return JSON.stringify(item);
        })
        .join(" | ");
    } else if (typeof detail === "object" && detail !== null) {
      detail = JSON.stringify(detail);
    }

    throw new Error(detail || `요청 실패 (${res.status})`);
  }

  return data;
}

export async function apiGet(url) {
  const res = await fetch(url, { cache: "no-store" });
  return parseJson(res);
}

export async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseJson(res);
}