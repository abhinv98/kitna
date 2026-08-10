import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Kitna? — live appraisal Edge Function.
 *
 * POST { image: "data:image/jpeg;base64,..." }
 *
 * Sends the image to AI/ML API (https://api.aimlapi.com/v1/chat/completions)
 * with a vision-capable model and response_format: { type: "json_object" },
 * then returns exactly the AppraisalResult shape expected by
 * src/lib/appraise.ts (validateResult).
 *
 * priceSource is "live" only when at least one real comparable price was
 * parsed from a Bright Data Google SERP lookup; otherwise "estimate" with
 * comparablePrices []. A bad or missing lookup NEVER blocks the appraisal —
 * it degrades silently to the model's estimate.
 *
 * Auth: the client calls this from the browser using the project's
 * publishable key (sb_publishable_...), which is public by design and is not
 * a JWT, so the legacy verify_jwt option is disabled. We accept the
 * publishable key and additionally verify real user JWTs via Supabase Auth
 * when one is presented.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_GRADES = ["Mint", "Excellent", "Good", "Fair", "Poor"];

const SYSTEM_PROMPT = `You are an expert secondhand-market appraiser for India. Analyze the item in the photo and return ONLY a JSON object (no markdown, no commentary, no trailing text) with exactly these fields:

{
  "itemName": "short product name",
  "brand": "brand name, or \"Unknown brand\" if not visible",
  "category": "category e.g. Electronics > Audio",
  "conditionGrade": "one of exactly: Mint, Excellent, Good, Fair, Poor",
  "conditionNotes": "2-3 sentences, each naming a specific visible cue",
  "keyAttributes": ["3-5 notable specs or features"],
  "resaleRangeLow": 0,
  "resaleRangeHigh": 0,
  "retailPrice": 0,
  "searchQuery": "search string to use on a resale site",
  "typicalPrice": 0,
  "bestChannel": "olx | facebook | quikr | ebay",
  "listingTitle": "SEO-friendly listing title",
  "listingDescription": "3-5 sentence listing description",
  "suggestedPrice": 0,
  "askingPrice": 0,
  "walkAwayFloor": 0,
  "counterLines": ["exactly 2 short Hinglish negotiation comebacks"],
  "confidence": 0.8
}

Rules:
- All prices are in Indian Rupees (INR), plain numbers, never strings.
- resaleRangeLow <= resaleRangeHigh; suggestedPrice and askingPrice <= resaleRangeHigh.
- Do NOT invent a retail price; use null when unknown.
- Do NOT include priceSource or comparablePrices — the server fills those in.
- If the item is unclear, make your best educated guess — never refuse.
- "brand" must be visibly identifiable in the photo (logo, printed text, or an unmistakable brand marking). Otherwise set it to "Unknown brand" — never guess a brand that is not visible.
- "conditionNotes" must be 2-3 sentences, and every sentence must name a specific cue you can actually see in the photo — e.g. "scuffing on the lower left bezel", "the charging port looks clean", "no box or cable visible in the frame". NEVER claim a scratch, dent, stain, missing accessory, or any defect that is not visible; if the item looks clean, say so plainly.
- "counterLines" must be exactly 2 short lines of natural Mumbai Hindi-English (Hinglish) that a real secondhand seller would say when a buyer offers too little — casual and friendly, not formal Hindi, not translated English. Example: "Thoda aur kar do na, ₹7,000 pe mil jayega." / "Achha, 6,800 final — aaj pickup kar lo toh."`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function authorize(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const apikeyHeader = req.headers.get("apikey") ?? "";
  const token = (
    authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader || apikeyHeader
  ).trim();

  if (!token) return false;

  // Publishable key — public by design, safe to accept from any client.
  if (token.startsWith("sb_publishable_")) return true;

  // Real JWT — verify signature against Supabase Auth.
  if (token.startsWith("eyJ")) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { error } = await supabase.auth.getUser(token);
    return !error;
  }

  return false;
}

/** Normalize a grade to one of the five valid values, else "Good". */
function normalizeGrade(raw: unknown): string {
  const s = String(raw ?? "Good").trim();
  const cap = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return VALID_GRADES.includes(cap) ? cap : "Good";
}

/** Coerce to a finite non-negative number, else fallback. */
function num(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/* ── Phase 2 — live comparable prices (Bright Data) ────────────────────── */

interface ComparablePrice {
  merchant: string;
  price: number;
  url: string;
}

const COMP_TIMEOUT_MS = 6000;
const MAX_COMPS = 5;
const MIN_PRICE = 50;
const MAX_PRICE = 5000000;

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

/**
 * Fetch up to 5 real comparable listings for the item via Bright Data.
 * Wrapped in its own try/catch + 6s timeout — any failure returns [] and the
 * appraisal degrades silently to the model's estimate. A price is only ever
 * included when it can be parsed confidently from the listing copy.
 */
async function fetchLiveComps(searchQuery: string): Promise<ComparablePrice[]> {
  const token = Deno.env.get("BRIGHTDATA_TOKEN");
  const zone = Deno.env.get("BRIGHTDATA_ZONE");
  if (!token || !zone) return [];

  const target =
    "https://www.google.com/search?q=" +
    encodeURIComponent(`${searchQuery} used price india`) +
    "&gl=in&hl=en&brd_json=1";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMP_TIMEOUT_MS);

  try {
    const resp = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ zone, url: target, format: "raw" }),
      signal: controller.signal,
    });
    if (!resp.ok) return [];

    const body = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return [];

    const entries = Array.isArray(body.result)
      ? (body.result as unknown[])
      : Array.isArray(body.results)
        ? (body.results as unknown[])
        : [];

    const comps: ComparablePrice[] = [];
    for (const entry of entries) {
      if (comps.length >= MAX_COMPS) break;
      const e = entry as Record<string, unknown>;
      const raw = typeof e.result === "string"
        ? e.result
        : typeof e.body === "string"
          ? e.body
          : null;
      if (!raw) continue;

      let serp: Record<string, unknown>;
      try {
        serp = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        continue; // not JSON — skip, never fail the whole lookup
      }

      const items = Array.isArray(serp.items)
        ? (serp.items as unknown[])
        : Array.isArray(serp.organic_results)
          ? (serp.organic_results as unknown[])
          : Array.isArray(serp.results)
            ? (serp.results as unknown[])
            : [];

      for (const item of items) {
        if (comps.length >= MAX_COMPS) break;
        const it = item as Record<string, unknown>;
        const title = String(it.title ?? "");
        const snippet = String(it.snippet ?? it.description ?? "");
        const link = String(it.link ?? it.url ?? "");
        if (!title || !link.startsWith("http")) continue;

        const price = parsePriceINR(`${title} ${snippet}`);
        if (price === null) continue; // uncertain price → drop the result

        comps.push({ merchant: domainToMerchant(link), price, url: link });
      }
    }
    return comps;
  } catch {
    return []; // never block an appraisal on a comp-lookup failure
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!(await authorize(req))) return json({ error: "Unauthorized" }, 401);

  let body: { image?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.image !== "string" || body.image.length === 0) {
    return json({ error: "Missing 'image' field (data URL)" }, 400);
  }
  const imageDataUrl = body.image.startsWith("data:")
    ? body.image
    : `data:image/jpeg;base64,${body.image}`;

  const AIMLAPI_KEY = Deno.env.get("AIMLAPI_KEY");
  if (!AIMLAPI_KEY) {
    return json(
      { error: "AI vision key not configured — add AIMLAPI_KEY in Edge Function secrets" },
      503,
    );
  }

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Appraise the item in this photo and return structured JSON." },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 2000,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let aiResp: Response;
  try {
    aiResp = await fetch("https://api.aimlapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIMLAPI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error && err.name === "AbortError"
      ? "Vision API timed out after 60 seconds"
      : `Vision API request failed: ${err instanceof Error ? err.message : "unknown error"}`;
    return json({ error: message }, 502);
  }
  clearTimeout(timeout);

  if (!aiResp.ok) {
    const text = await aiResp.text().catch(() => "(no body)");
    return json({ error: `AIMLAPI returned ${aiResp.status}: ${text.slice(0, 500)}` }, 502);
  }

  const aiData = await aiResp.json().catch(() => null);
  const content = aiData?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    return json({ error: "Empty response from vision model" }, 502);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return json({ error: "Vision model returned non-JSON content" }, 502);
  }

  // ── Build the exact AppraisalResult shape (see src/lib/types.ts) ──
  const itemName = String(parsed.itemName ?? "Unknown item").trim() || "Unknown item";
  const brand = String(parsed.brand ?? "Unknown brand").trim() || "Unknown brand";
  const resaleRangeLow = num(parsed.resaleRangeLow, 0);
  const resaleRangeHigh = Math.max(num(parsed.resaleRangeHigh, resaleRangeLow), resaleRangeLow);
  const suggestedPrice = num(parsed.suggestedPrice, resaleRangeHigh);
  const retail = parsed.retailPrice == null ? null : num(parsed.retailPrice, 0);
  const searchQuery = String(parsed.searchQuery ?? "").trim();

  // Live comparable prices — best effort only. "live" ONLY when at least one
  // real price was parsed; otherwise degrade to the model's estimate.
  const liveComps = searchQuery ? await fetchLiveComps(searchQuery) : [];
  const hasLiveComps = liveComps.length > 0;

  const result = {
    itemName,
    brand,
    category: String(parsed.category ?? "General").trim() || "General",
    conditionGrade: normalizeGrade(parsed.conditionGrade),
    conditionNotes: String(parsed.conditionNotes ?? "Inspected visually.").trim() ||
      "Inspected visually.",
    keyAttributes: Array.isArray(parsed.keyAttributes) ? parsed.keyAttributes.map(String) : [],
    resaleRangeLow,
    resaleRangeHigh,
    retailPrice: retail,
    priceSource: hasLiveComps ? "live" : "estimate",
    comparablePrices: hasLiveComps ? liveComps : [],
    searchQuery,
    typicalPrice: num(parsed.typicalPrice, resaleRangeHigh),
    bestChannel: String(parsed.bestChannel ?? "olx").trim() || "olx",
    listingTitle: String(parsed.listingTitle ?? `${brand} ${itemName} — For Sale`).trim() ||
      `${brand} ${itemName} — For Sale`,
    listingDescription: String(parsed.listingDescription ?? parsed.conditionNotes ?? "").trim(),
    suggestedPrice,
    askingPrice: num(parsed.askingPrice, suggestedPrice),
    walkAwayFloor: num(parsed.walkAwayFloor, Math.round(resaleRangeLow * 0.85)),
    counterLines: Array.isArray(parsed.counterLines) ? parsed.counterLines.map(String) : [],
    confidence: Math.min(1, Math.max(0, num(parsed.confidence, 0.8))),
  };

  return json(result, 200);
});
