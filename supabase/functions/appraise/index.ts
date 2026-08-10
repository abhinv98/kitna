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
 * parsed from a Google SERP lookup via the Node.js comps proxy (Vercel);
 * otherwise "estimate" with comparablePrices []. A bad or missing lookup
 * NEVER blocks the appraisal — it degrades silently to the model's estimate.
 * Lookup failures are recorded in _debug (x-kitna-debug: 1) so the actual
 * proxy error is visible instead of being hidden.
 *
 * Auth: the client calls this from the browser using the project's
 * publishable key (sb_publishable_...), which is public by design and is not
 * a JWT, so the legacy verify_jwt option is disabled. We accept the
 * publishable key and additionally verify real user JWTs via Supabase Auth
 * when one is presented.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kitna-debug",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Diagnostics for the comps lookup — surfaced via x-kitna-debug: 1.
const __bdDebug: string[] = [];

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

/* ── Phase 2 — live comparable prices (Node.js comps proxy) ────────────── */

interface ComparablePrice {
  merchant: string;
  price: number;
  url: string;
}

const COMP_TIMEOUT_MS = 6000;

/**
 * Fetch up to 5 real comparable listings for the item.
 *
 * The Bright Data call itself lives in a Node.js serverless function
 * (api/comps.ts on Vercel) because the Supabase Deno edge runtime cannot
 * complete an HTTP/2 fetch to api.brightdata.com (known Deno runtime bug),
 * while Node.js succeeds. This function calls that proxy — POST
 * { searchQuery } with the shared x-kitna-key header — and reads { comps }
 * back. Wrapped in its own try/catch + 6s timeout: any failure returns []
 * and the appraisal degrades silently to the model's estimate. Failures are
 * recorded in __bdDebug so the actual proxy error is visible in the _debug
 * payload instead of being swallowed.
 */
async function fetchLiveComps(searchQuery: string): Promise<ComparablePrice[]> {
  const proxyUrl = Deno.env.get("COMPS_PROXY_URL");
  const key = Deno.env.get("KITNA_PROXY_KEY");
  if (!proxyUrl || !key) {
    __bdDebug.push(`Comps proxy config missing: url=${!!proxyUrl} key=${!!key}`);
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COMP_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-kitna-key": key,
      },
      body: JSON.stringify({ searchQuery }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error && err.name === "AbortError"
      ? `Comps proxy timed out after ${COMP_TIMEOUT_MS}ms`
      : `Comps proxy request failed: ${err instanceof Error ? err.message : "unknown error"}`;
    __bdDebug.push(`Comps proxy threw: ${msg}`);
    return [];
  }
  clearTimeout(timeout);

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    __bdDebug.push(`Comps proxy failed: status=${resp.status} body=${text.slice(0, 300)}`);
    return [];
  }

  const data = (await resp.json().catch(() => null)) as { comps?: unknown } | null;
  const rawComps = Array.isArray(data?.comps) ? data.comps : [];
  const comps: ComparablePrice[] = rawComps.filter(
    (c): c is ComparablePrice =>
      !!c &&
      typeof (c as ComparablePrice).merchant === "string" &&
      typeof (c as ComparablePrice).price === "number" &&
      typeof (c as ComparablePrice).url === "string",
  );

  if (comps.length === 0) {
    __bdDebug.push("Comps proxy returned no comparable prices");
  } else {
    __bdDebug.push(`Comps proxy ok: ${comps.length} comparable prices parsed`);
  }
  return comps;
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

  const DEBUG = req.headers.get("x-kitna-debug") === "1";
  if (DEBUG) return json({ ...result, _debug: __bdDebug }, 200);
  return json(result, 200);
});
