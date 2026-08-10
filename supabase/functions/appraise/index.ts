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
 * priceSource is always "estimate" and comparablePrices [] — real comparable
 * prices require Bright Data lookups (Phase 2) and are not fetched yet.
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
  "brand": "brand name",
  "category": "category e.g. Electronics > Audio",
  "conditionGrade": "one of exactly: Mint, Excellent, Good, Fair, Poor",
  "conditionNotes": "2-3 sentences on visible wear, scratches, defects, and apparent functionality",
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
  "counterLines": ["2-3 short negotiation comebacks for lowball offers"],
  "confidence": 0.8
}

Rules:
- All prices are in Indian Rupees (INR), plain numbers, never strings.
- resaleRangeLow <= resaleRangeHigh; suggestedPrice and askingPrice <= resaleRangeHigh.
- Do NOT invent a retail price; use null when unknown.
- Do NOT include priceSource or comparablePrices — the server fills those in.
- If the item is unclear, make your best educated guess — never refuse.`;

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
    priceSource: "estimate", // Phase 1 — no live comparable lookups yet
    comparablePrices: [], // real comps require Bright Data (Phase 2)
    searchQuery: String(parsed.searchQuery ?? "").trim(),
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
