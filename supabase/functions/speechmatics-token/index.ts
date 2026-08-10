import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Kitna? — Speechmatics realtime token Edge Function.
 *
 * POST {} → { "token": "<short-lived JWT>" }
 *
 * The long-lived SPEECHMATICS_API_KEY never leaves this function. The client
 * exchanges it for a 60-second temporary JWT, then opens the Speechmatics
 * realtime WebSocket with that JWT to transcribe one Mol-bhaav practice line.
 *
 * Auth: same pattern as `appraise` — the browser calls with the project's
 * publishable key (public by design, verify_jwt disabled); real user JWTs are
 * verified via Supabase Auth when presented.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!(await authorize(req))) return json({ error: "Unauthorized" }, 401);

  const key = Deno.env.get("SPEECHMATICS_API_KEY");
  if (!key) {
    return json(
      { error: "Voice practice isn't configured yet — add SPEECHMATICS_API_KEY in Edge Function secrets" },
      503,
    );
  }

  // ttl must be between 60 and 3600 seconds — the shortest value that covers
  // a client's connection setup.
  let resp: Response;
  try {
    resp = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: 60 }),
    });
  } catch {
    return json({ error: "Speechmatics token service unreachable" }, 502);
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return json(
      { error: `Speechmatics token request failed (${resp.status})` },
      502,
    );
  }

  const data = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
  const token = typeof data?.key === "string" ? data.key : typeof data?.token === "string" ? data.token : null;
  if (!token) {
    return json({ error: "Speechmatics returned no token" }, 502);
  }

  return json({ token }, 200);
});
