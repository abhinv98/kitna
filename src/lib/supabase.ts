import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public Supabase config — the publishable key is designed to be
 * embedded in client code. Secrets (AIMLAPI_KEY, BRIGHTDATA_TOKEN)
 * live only in Supabase Edge Function secrets, never here.
 */
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://jzqfynapxgsfmevnpptc.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "sb_publishable_ePSsZnj7mC7I7sUKDipSKA_6B1qOmk1";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}