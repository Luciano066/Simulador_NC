const FALLBACK_API_BASE_URL = "http://127.0.0.1:8000";

export function resolveApiBaseUrl(rawBaseUrl = import.meta.env.VITE_API_BASE_URL) {
  const candidate = typeof rawBaseUrl === "string" ? rawBaseUrl.trim() : "";
  const safeBaseUrl = candidate || FALLBACK_API_BASE_URL;
  return safeBaseUrl.replace(/\/+$/, "");
}

const API_BASE_URL = resolveApiBaseUrl();

export function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function parseArrayDetail(detail) {
  return detail
    .map((item) => {
      if (typeof item?.msg === "string") return item.msg;
      return JSON.stringify(item);
    })
    .join("; ");
}

export async function parseApiError(response) {
  try {
    const data = await response.clone().json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail.length) {
      return parseArrayDetail(data.detail);
    }
  } catch {
    // Fallback to plain text below.
  }

  try {
    const text = (await response.text()).trim();
    if (text) return text;
  } catch {
    // Ignore and fallback to generic message.
  }

  return `HTTP ${response.status}`;
}

export async function requestJson(path, payload) {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json();
}
