import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useManagedAppointment } from "@/hooks/use-managed-appointment";
import { useAvailability } from "@/hooks/use-availability";
import {
  RemoteCoreContext,
  RemoteAppointmentsContext,
  type RemoteCore,
} from "@/lib/supabase/core-context";
import type { SupabaseRepository } from "@/lib/supabase/repository";
import { defaultSettings } from "@/lib/preferences";
import { initialAppointments } from "@/lib/mock-data";

afterEach(cleanup);
const token = "a".repeat(64);
function environment(status: "pending" | "confirmed" | "cancelled" = "pending") {
  const appointment = { ...initialAppointments[0]!, id: "remote-appointment", token, status };
  const managed = vi.fn().mockResolvedValue(appointment);
  const change = vi.fn(async (_id, action, input) => ({
    ...appointment,
    status: action === "cancel" ? "cancelled" : action === "confirm" ? "confirmed" : "pending",
    ...(action === "reschedule" ? { start: new Date(input.starts_at) } : {}),
  }));
  const calendar = vi
    .fn()
    .mockResolvedValue({ settings: defaultSettings, slots: [new Date("2026-11-02T09:00:00Z")] });
  const forbidden = vi.fn(() => {
    throw new Error("Temporary store must not authorize token operations");
  });
  const core: RemoteCore = {
    settings: defaultSettings,
    contacts: [],
    session: null,
    authReady: false,
    loading: false,
    error: null,
    adminError: null,
    busy: false,
    repository: { managed, change, calendar } as unknown as SupabaseRepository,
    signIn: vi.fn(),
    signOut: vi.fn(),
    saveSettings: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    rememberManaged: forbidden,
    tokenFor: vi.fn().mockReturnValue(undefined),
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <RemoteCoreContext.Provider value={core}>
        <RemoteAppointmentsContext.Provider
          value={{
            appointments: [],
            ready: true,
            add: forbidden,
            setStatus: forbidden,
            reschedule: forbidden,
            update: forbidden,
          }}
        >
          {children}
        </RemoteAppointmentsContext.Provider>
      </RemoteCoreContext.Provider>
    </QueryClientProvider>
  );
  return { appointment, managed, change, calendar, wrapper, client, core, forbidden };
}

describe("Management URL after a full reload", () => {
  it("fetches by URL token with no session, booking state or stored appointment", async () => {
    const env = environment();
    const first = renderHook(() => useManagedAppointment(token), { wrapper: env.wrapper });
    await waitFor(() => expect(first.result.current.appointment?.id).toBe(env.appointment.id));
    expect(env.managed).toHaveBeenCalledWith(token);
    expect(env.forbidden).not.toHaveBeenCalled();
    first.unmount();
    env.client.clear();
    const reloaded = environment("confirmed");
    const second = renderHook(() => useManagedAppointment(token), { wrapper: reloaded.wrapper });
    await waitFor(() => expect(second.result.current.appointment?.status).toBe("confirmed"));
    expect(reloaded.managed).toHaveBeenCalledWith(token);
  });
  it.each(["confirm", "cancel", "reschedule"] as const)(
    "authorizes %s directly with the URL token after reload",
    async (action) => {
      const env = environment();
      const hook = renderHook(() => useManagedAppointment(token), { wrapper: env.wrapper });
      await waitFor(() => expect(hook.result.current.appointment).toBeDefined());
      const start = new Date("2026-11-02T09:00:00Z");
      await act(async () => {
        if (action === "reschedule") await hook.result.current.reschedule(start);
        else await hook.result.current[action]();
      });
      expect(env.change).toHaveBeenCalledWith(
        "",
        action,
        action === "reschedule" ? { starts_at: start.toISOString() } : {},
        token,
      );
      await waitFor(() =>
        expect(hook.result.current.appointment?.status).toBe(
          action === "confirm" ? "confirmed" : action === "cancel" ? "cancelled" : "pending",
        ),
      );
      expect(env.forbidden).not.toHaveBeenCalled();
    },
  );
  it("loads rescheduling slots with the URL token without a remembered capability", async () => {
    const env = environment();
    const hook = renderHook(() => useAvailability(30, env.appointment.id, token), {
      wrapper: env.wrapper,
    });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(env.calendar).toHaveBeenCalledWith(30, token, undefined);
    expect(env.core.tokenFor).not.toHaveBeenCalled();
  });
  it("keeps invalid or revoked tokens in the not-found state", async () => {
    const env = environment();
    env.managed.mockResolvedValue(null);
    const hook = renderHook(() => useManagedAppointment(token), { wrapper: env.wrapper });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.appointment).toBeNull();
    expect(env.change).not.toHaveBeenCalled();
  });
});
