/**
 * Kitna? — Node.js comps proxy (Vercel serverless function).
 *
 * Why this exists: Supabase's Deno edge runtime cannot complete an HTTP/2
 * fetch to api.brightdata.com (known Deno runtime bug — "http2 error: stream
 * error detected: unspecific protocol error detected"), while the exact same
 * request succeeds from Node.js and curl. This function therefore hosts the
 * Bright Data call and the SERP parsing on Vercel's Node.js runtime; the
 * appraise Edge Function calls this endpoint with a shared secret.
 *
 * POST { searchQuery }  +  header x-kitna-key: <shared secret>
 * → 200 { comps: [{ merchant, price, url }, ...] }   (comps may be [])
 */
export const config = { runtime: "nodejs" };

const COMP_TIMEOUT_MS = 15000;
const MAX_COMPS = 5;
const MIN_PRICE = 50;
const MAX_PRICE = 5000000;

/* ── Parsing — moved verbatim from supabase/functions/appraise/index.ts ── */

/**
 * Parse a plausible INR price out of a listing title/snippet.
 * Returns null when we cannot confidently extract one — never guess.
 */
function parsePriceINR(text: string): number | null {
  const t = text.replace(/,/g, "");

  // Explicit currency marker: "₹5,000", "Rs 12000", "INR 15k", "1.2 lakh"
  const currency = t.match(
    /(?:₹|rs\.?|inr|rupees?|रु)\s*(\d+(?:\.\d+)?)(?:\s*(k|lakh|lacs?))?/i,
  );
  if (currency) {
    const n = Number(currency[1]);
    const suffix = (currency[2] ?? "").toLowerCase();
    const value = suffix.startsWith("l") ? n * 100000 : suffix ? n * 1000 : n;
    return value >= MIN_PRICE && value <= MAX_PRICE ? Math.round(value) : null;
  }

  // Suffixed number: "12k" or "1.2 lakh"
  const suffixed = t.match(/\b(\d+(?:\.\d+)?)\s*(lakh|lacs?|k)\b/i);
  if (suffixed) {
    const n = Number(suffixed[1]);
    const suffix = suffixed[2].toLowerCase();
    const value = suffix.startsWith("l") ? n * 100000 : n * 1000;
    return value >= MIN_PRICE && value <= MAX_PRICE ? Math.round(value) : null;
  }

  // Bare number, only when the copy clearly reads like a listing price.
  if (/(?:price|asking|selling|for\s*sale|offer|negotiable|wanted)/i.test(t)) {
    const bare = t.match(/\b(\d{3,7})\b/);
    if (bare) {
      const n = Number(bare[1]);
      return n >= MIN_PRICE && n <= MAX_PRICE ? n : null;
    }
  }

  return null;
}

const MERCHANT_LABELS: Record<string, string> = {
  olx: "OLX",
  quikr: "Quikr",
  ebay: "eBay",
  amazon: "Amazon",
  flipkart: "Flipkart",
  facebook: "Facebook Marketplace",
  instagram: "Instagram",
  snapdeal: "Snapdeal",
  shopclues: "ShopClues",
  meesho: "Meesho",
  croma: "Croma",
  reliancedigital: "Reliance Digital",
  headphonezone: "Headphone Zone",
  myntra: "Myntra",
  superkicks: "Superkicks",
  apple: "Apple India",
  nike: "Nike India",
  paytm: "Paytm Mall",
};

/** Derive a human merchant label from a listing URL's domain. */
function domainToMerchant(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    let base = host.split(".")[0];
    if (["m", "mobile", "in", "en", "www"].includes(base)) {
      base = host.split(".")[1] ?? base;
    }
    return MERCHANT_LABELS[base] ??
      (base.charAt(0).toUpperCase() + base.slice(1));
  } catch {
    return "Marketplace";
  }
}

/* ── Handler ── */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Shared secret — the endpoint must not be open to the world.
  const sharedKey = process.env.KITNA_PROXY_KEY;
  if (!sharedKey || req.headers.get("x-kitna-key") !== sharedKey) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { searchQuery?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const searchQuery = typeof body.searchQuery === "string" ? body.searchQuery.trim() : "";
  if (!searchQuery) return json({ error: "Missing 'searchQuery' field" }, 400);

  const token = process.env.BRIGHTDATA_TOKEN;
  const zone = process.env.BRIGHTDATA_ZONE;
  if (!token || !zone) {
    return json({ error: "Bright Data not configured on this function" }, 503);
  }

  const target =
    "https://www.google.com/search?q=" +
    encodeURIComponent(`${searchQuery} used price india`) +
    "&gl=in&hl=en&brd_json=1";

  let resp: Response;
  try {
    resp = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ zone, url: target, format: "raw" }),
      signal: AbortSignal.timeout(COMP_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return json({ error: `Bright Data request failed: ${msg}` }, 502);
  }

  // Bright Data reports policy/zone errors as HTTP 200 with the real error in
  // headers (x-brd-err-code / x-brd-error / proxy-status) and an empty body —
  // surface those instead of silently treating the lookup as "no results".
  const errCode = resp.headers.get("x-brd-err-code");
  const errMsg = resp.headers.get("x-brd-error");
  if (!resp.ok || errCode || errMsg) {
    const text = await resp.text().catch(() => "");
    return json(
      {
        error:
          `BD lookup failed: status=${resp.status} errCode=${errCode ?? "-"} ` +
          `errMsg=${(errMsg || text).slice(0, 300)}`,
      },
      502,
    );
  }

  // Bright Data brd_json returns the SERP object directly at the top level —
  // no array wrapper, no stringified inner payload — with organic results in
  // body.organic. Extract the first array container present, in preference
  // order: organic → organic_results → items → results.
  const serp = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
  const items = serp
    ? (["organic", "organic_results", "items", "results"] as const)
        .map((key) => serp[key])
        .find((value) => Array.isArray(value)) as unknown[] | undefined
    : undefined;

  const comps: { merchant: string; price: number; url: string }[] = [];
  for (const item of items ?? []) {
    const rec = item as Record<string, unknown>;
    const title = String(rec.title ?? "");
    // brd_json organic entries expose link/description; keep url/snippet as
    // fallbacks for other shapes.
    const url = String(rec.link ?? rec.url ?? "");
    const snippet = String(rec.snippet ?? rec.description ?? "");
    const price = parsePriceINR(`${title} ${snippet}`);
    if (price !== null && url.startsWith("http")) {
      comps.push({ merchant: domainToMerchant(url), price, url });
    }
    if (comps.length >= MAX_COMPS) break;
  }

  return json({ comps });
}
