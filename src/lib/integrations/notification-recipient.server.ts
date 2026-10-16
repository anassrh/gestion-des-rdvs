import { createClient } from "@supabase/supabase-js";

export async function getNotificationRecipient(
  ownerId: string,
  env: Record<string, string | undefined>,
) {
  // The public booking client cannot read private owner contact fields.
  // This key is used only in a server module, never returned or exposed via VITE_*.
  const secret = env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("Server notification lookup is not configured");
  const client = createClient(
    env["VITE_SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"],
    secret,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client
    .from("profiles")
    .select("notification_email,email")
    .eq("id", ownerId)
    .single();
  if (error) throw new Error("Notification recipient could not be loaded");
  return (
    data.notification_email?.trim() || data.email?.trim() || env["N8N_ADMIN_NOTIFICATION_EMAIL"]
  );
}
