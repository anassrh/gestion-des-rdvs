import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const key = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
// Unit fixtures retain the local adapter; the configured application never falls back on errors.
export const supabaseEnabled = import.meta.env.MODE !== "test" && Boolean(url || key);
let client: SupabaseClient | undefined;
export function getSupabaseClient() {
  if (!url || !key)
    throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.");
  if (!client)
    client = createClient(url, key, {
      auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: false,
      },
    });
  return client;
}
