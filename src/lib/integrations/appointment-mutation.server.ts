import { createClient } from "@supabase/supabase-js";
import type { RpcTransport } from "../supabase/repository";
import { notifyCommittedAppointment } from "./n8n.server";

export async function executeAppointmentMutation(
  name: string,
  input: Record<string, unknown>,
  transport: RpcTransport,
  env: Record<string, string | undefined>,
  fetcher?: typeof fetch,
  background?: (task: Promise<void>) => void,
) {
  const result = await transport.rpc(name, input);
  if (!result.error) {
    const notification = notifyCommittedAppointment({
      name,
      input,
      result: result.data,
      transport,
      env,
      ...(fetcher ? { fetcher } : {}),
    }).catch(() => {
      console.warn("Appointment notification failed", { reason: "background_delivery" });
    });
    // Keep delivery alive on edge runtimes without holding the booking response.
    try {
      background?.(notification);
    } catch {
      console.warn("Appointment notification failed", { reason: "background_registration" });
    }
  }
  return result;
}

export function mutationTransport(accessToken?: string): RpcTransport {
  // Per-request client; the caller's JWT retains the existing owner RLS checks.
  const client = createClient(
    process.env["VITE_SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"],
    process.env["VITE_SUPABASE_ANON_KEY"] ?? import.meta.env["VITE_SUPABASE_ANON_KEY"],
    {
      auth: { persistSession: false, autoRefreshToken: false },
      ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
    },
  );
  return { rpc: async (name, input) => await client.rpc(name, input) };
}
