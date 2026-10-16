// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { executeAppointmentMutation as mutate } from "@/lib/integrations/appointment-mutation.server";
import { buildAppointmentPayload, sendAppointmentEvent } from "@/lib/integrations/n8n.server";
import { mapAppointment } from "@/lib/supabase/mapping";

// Delivery assertions explicitly drain the background work; the response test
// below calls the actual mutation directly and leaves the webhook unresolved.
async function executeAppointmentMutation(...args: Parameters<typeof mutate>) {
  const pending: Promise<void>[] = [];
  const result = await mutate(args[0], args[1], args[2], args[3], args[4], (task) =>
    pending.push(task),
  );
  await Promise.all(pending);
  return result;
}

const token = "a".repeat(64);
const row = {
  id: "11111111-1111-4111-8111-111111111111",
  contact_id: "contact",
  starts_at: "2026-11-02T09:15:00Z",
  duration_minutes: 30,
  meeting_type: "technical",
  status: "pending",
  notes: "Client note",
  created_at: "2026-10-16T08:00:00Z",
  contact: {
    id: "contact",
    full_name: "Marie Dupont",
    first_name: "Marie",
    last_name: "Dupont",
    email: "marie@example.com",
    phone: "+33611223344",
  },
};
const env = {
  N8N_APPOINTMENT_WEBHOOK_URL: "https://n8n.example/webhook/appointments",
  N8N_ADMIN_NOTIFICATION_EMAIL: "owner@example.com",
  APP_PUBLIC_URL: "https://app.example/",
};
const config = {
  webhook: env.N8N_APPOINTMENT_WEBHOOK_URL,
  adminEmail: env.N8N_ADMIN_NOTIFICATION_EMAIL,
  publicUrl: env.APP_PUBLIC_URL,
};
const owner = { name: "Owner from database", timezone: "Europe/Paris" };
const event = {
  eventType: "APPOINTMENT_CREATED" as const,
  appointment: mapAppointment(row),
  owner,
  token,
  config,
};
const profile = { profile: { display_name: owner.name, timezone: owner.timezone } };
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("n8n appointment notifications", () => {
  it("returns the committed result while a slow webhook is still pending", async () => {
    const result = { data: { appointment: row, management_token: token }, error: null };
    const rpc = vi
      .fn()
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce({ data: profile, error: null });
    let release!: (response: Response) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    const pending: Promise<void>[] = [];
    const response = await mutate("create_booking", {}, { rpc }, env, fetcher, (task) =>
      pending.push(task),
    );
    expect(response).toBe(result);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(pending).toHaveLength(1);
    release(new Response(null, { status: 200 }));
    await Promise.all(pending);
  });
  it("builds the exact payload from database values, owner timezone and configured URLs", () => {
    const payload = buildAppointmentPayload(event);
    expect(payload).toEqual({
      event_id: expect.any(String),
      event_type: "APPOINTMENT_CREATED",
      appointment_id: row.id,
      client: {
        first_name: "Marie",
        last_name: "Dupont",
        email: "marie@example.com",
        phone: "+33611223344",
      },
      appointment: {
        date: "2026-11-02",
        time: "10:15",
        duration_minutes: 30,
        meeting_type: "technical",
        notes: "Client note",
      },
      admin: { name: owner.name, email: "owner@example.com" },
      management_url: `https://app.example/manage/${token}`,
      admin_url: "https://app.example/admin/appointments",
    });
    expect(buildAppointmentPayload(event).event_id).not.toBe(payload.event_id);
  });
  it("uses the new date and handles midnight across timezone boundaries", () => {
    const payload = buildAppointmentPayload({
      ...event,
      eventType: "APPOINTMENT_RESCHEDULED",
      appointment: mapAppointment({ ...row, starts_at: "2026-10-20T22:15:00Z" }),
    });
    expect(payload.appointment).toMatchObject({ date: "2026-10-21", time: "00:15" });
  });
  it("posts JSON only after the database result has succeeded", async () => {
    let committed = false;
    const rpc = vi.fn(async (name: string) => {
      if (name === "create_booking") {
        committed = true;
        return { data: { appointment: row, management_token: token }, error: null };
      }
      return { data: profile, error: null };
    });
    const fetcher = vi.fn(async (_url, init) => {
      expect(committed).toBe(true);
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(init?.body as string).event_type).toBe("APPOINTMENT_CREATED");
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;
    const result = await executeAppointmentMutation(
      "create_booking",
      { p_input: {} },
      { rpc },
      env,
      fetcher,
    );
    expect(result.error).toBeNull();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("does not post for a rejected database mutation", async () => {
    const error = { code: "23P01", message: "Slot occupied" };
    const rpc = vi.fn().mockResolvedValue({ data: null, error });
    const fetcher = vi.fn();
    expect(await executeAppointmentMutation("create_booking", {}, { rpc }, env, fetcher)).toEqual({
      data: null,
      error,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledOnce();
  });
  it.each(["confirm", "edit", "complete"])("does not notify for %s", async (action) => {
    const rpc = vi.fn().mockResolvedValue({ data: row, error: null });
    const fetcher = vi.fn();
    await executeAppointmentMutation(
      "admin_change_appointment",
      { p_action: action },
      { rpc },
      env,
      fetcher,
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledOnce();
  });
  it.each([
    ["reschedule", "APPOINTMENT_RESCHEDULED"],
    ["cancel", "APPOINTMENT_CANCELLED"],
  ])("uses the existing client token for %s", async (action, type) => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: row, error: null })
      .mockResolvedValueOnce({ data: profile, error: null });
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await executeAppointmentMutation(
      "manage_appointment",
      { p_action: action, p_token: token },
      { rpc },
      env,
      fetcher,
    );
    const payload = JSON.parse(fetcher.mock.calls[0]![1].body as string);
    expect(payload.event_type).toBe(type);
    expect(payload.management_url).toContain(token);
    expect(rpc).not.toHaveBeenCalledWith("admin_issue_management_token", expect.anything());
  });
  it("issues a management capability after an authenticated admin cancellation", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: row, error: null })
      .mockResolvedValueOnce({ data: token, error: null })
      .mockResolvedValueOnce({ data: profile, error: null });
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    await executeAppointmentMutation(
      "admin_change_appointment",
      { p_action: "cancel", p_id: row.id },
      { rpc },
      env,
      fetcher,
    );
    expect(rpc).toHaveBeenNthCalledWith(2, "admin_issue_management_token", { p_id: row.id });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each(["http", "network"])(
    "preserves the successful database result on %s failure without logging private data",
    async (failure) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const rpc = vi
        .fn()
        .mockResolvedValueOnce({ data: { appointment: row, management_token: token }, error: null })
        .mockResolvedValueOnce({ data: profile, error: null });
      const fetcher =
        failure === "http"
          ? vi.fn().mockResolvedValue(new Response(null, { status: 503 }))
          : vi.fn().mockRejectedValue(new Error("Sensitive upstream content"));
      const result = await executeAppointmentMutation("create_booking", {}, { rpc }, env, fetcher);
      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({ appointment: row });
      expect(warn).toHaveBeenCalledOnce();
      const log = JSON.stringify(warn.mock.calls);
      expect(log).not.toContain(row.contact.email);
      expect(log).not.toContain(token);
      expect(log).not.toContain("Sensitive");
    },
  );
  it("bounds the webhook request with a timeout and absorbs abort failures", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const aborted = new AbortController();
    aborted.abort();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(aborted.signal);
    const fetcher = vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    await expect(sendAppointmentEvent(event, fetcher)).resolves.toBeUndefined();
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(fetcher.mock.calls[0]![1].signal.aborted).toBe(true);
  });
  it("does not break committed bookings if notification configuration is missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { appointment: row, management_token: token }, error: null });
    const fetcher = vi.fn();
    expect(
      (await executeAppointmentMutation("create_booking", {}, { rpc }, {}, fetcher)).error,
    ).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
