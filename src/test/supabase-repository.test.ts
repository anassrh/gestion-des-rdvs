import { describe, expect, it, vi } from "vitest";
import { SupabaseRepository, bookingInput, type NewAppointment } from "@/lib/supabase/repository";
import { mapAppointment, mapCalendar, mapSnapshot } from "@/lib/supabase/mapping";

const token = "a".repeat(64);
const contact = {
  id: "contact",
  full_name: "Marie Dupont",
  first_name: "Marie",
  last_name: "Dupont",
  email: "marie@example.com",
  phone: "+33 6 11 22 33 44",
  company: "Example",
};
const row = {
  id: "appointment",
  contact_id: "contact",
  starts_at: "2026-11-02T09:00:00+00:00",
  duration_minutes: 30,
  meeting_type: "technical",
  status: "pending",
  notes: "Brief",
  created_at: "2026-10-16T08:00:00Z",
  contact,
  events: [{ event_type: "created", actor_type: "public", created_at: "2026-10-16T08:00:00Z" }],
};
const config = {
  profile: { display_name: "Benoît", role_label: "CTO", timezone: "Europe/Paris" },
  preferences: {
    duration_minutes: 30,
    buffer_minutes: 15,
    minimum_notice_hours: 24,
    booking_horizon_days: 60,
  },
  rules: [{ weekday: 1, enabled: true, start_local_time: "09:00:00", end_local_time: "18:00:00" }],
};
const appointment: NewAppointment = {
  contactId: "contact",
  guest: {
    id: "contact",
    name: "Marie Dupont",
    firstName: "Marie",
    lastName: "Dupont",
    email: " Marie@Example.com ",
    phone: contact.phone,
    company: "Example",
    role: "",
    notes: "",
  },
  start: new Date(row.starts_at),
  duration: 30,
  type: "technical",
  status: "confirmed",
  notes: "Brief",
  reminder: "none",
};

describe("Supabase repository boundary", () => {
  it("uses booking snapshots by appointment ID while preserving the deduplicated canonical contact", async () => {
    const guest = {
      ...contact,
      full_name: "N8N N8N",
      first_name: "N8N",
      last_name: "N8N",
      company: "New booking company",
    };
    const rpc = vi.fn().mockResolvedValue({
      data: { ...config, contacts: [contact], appointments: [row, { ...row, id: "second" }] },
      error: null,
    });
    const repository = new SupabaseRepository({
      rpc,
      appointmentSnapshots: async () =>
        new Map([
          ["second", { ...contact, full_name: "Other Booking" }],
          [row.id, guest],
        ]),
    });
    const snapshot = await repository.list();
    expect(snapshot.appointments[0]?.guest).toMatchObject({
      name: "N8N N8N",
      company: "New booking company",
    });
    expect(snapshot.appointments[1]?.guest?.name).toBe("Other Booking");
    expect(snapshot.appointments[0]?.contactId).toBe(contact.id);
    expect(snapshot.contacts[0]?.name).toBe("Marie Dupont");
    expect(mapAppointment({ ...row, guest_details: guest }).guest?.name).toBe("N8N N8N");
  });
  it("normalizes public input and leaves status and duration to the server", () => {
    const input = bookingInput(appointment);
    expect(input).toMatchObject({
      first_name: "Marie",
      last_name: "Dupont",
      email: "marie@example.com",
      starts_at: "2026-11-02T09:00:00.000Z",
    });
    expect(input).not.toHaveProperty("status");
    expect(input).not.toHaveProperty("duration_minutes");
  });
  it("rejects invalid personal input before the network call", async () => {
    const rpc = vi.fn();
    const repository = new SupabaseRepository({ rpc });
    await expect(
      repository.create(
        { ...appointment, guest: { ...appointment.guest!, email: "invalid" } },
        "public",
      ),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("maps timestamps, optional contact fields and audit labels without inventing reminders", () => {
    const mapped = mapAppointment(row);
    expect(mapped.start.toISOString()).toBe("2026-11-02T09:00:00.000Z");
    expect(mapped.guest?.notes).toBe("");
    expect(mapped.history[0]?.label).toBe("Appointment created (public)");
    expect(mapped.reminder).toBe("none");
    expect(mapped.token).toBe("");
    expect(() => mapAppointment({ ...row, status: "invented" })).toThrow();
  });
  it("maps safe public settings and rejects malformed server timestamps", () => {
    const calendar = mapCalendar({ ...config, slots: [row.starts_at] });
    expect(calendar.settings).toMatchObject({
      name: "Benoît",
      email: "",
      timezone: "Europe/Paris",
      days: [1],
      start: "09:00",
      buffer: 15,
    });
    expect(calendar.slots[0]).toBeInstanceOf(Date);
    expect(() => mapCalendar({ ...config, slots: ["not a timestamp"] })).toThrow();
    expect(
      mapSnapshot({ ...config, appointments: [row], contacts: [contact] }).appointments,
    ).toHaveLength(1);
  });
  it("uses narrow booking and token RPCs and returns only the issued capability", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: { appointment: row, management_token: token }, error: null })
      .mockResolvedValueOnce({ data: row, error: null });
    const repository = new SupabaseRepository({ rpc });
    expect((await repository.create(appointment, "public")).token).toBe(token);
    expect(rpc.mock.calls[0]?.[0]).toBe("create_booking");
    expect((await repository.managed(token))?.id).toBe(row.id);
    expect(rpc.mock.calls[1]).toEqual(["get_managed_appointment", { p_token: token }]);
    await expect(repository.managed("invalid")).rejects.toThrow();
    expect(rpc).toHaveBeenCalledTimes(2);
  });
  it("distinguishes token actions from authenticated administrator actions", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: row, error: null });
    const repository = new SupabaseRepository({ rpc });
    await repository.change(row.id, "confirm", {}, token);
    await repository.change(row.id, "complete");
    expect(rpc.mock.calls[0]).toEqual([
      "manage_appointment",
      { p_token: token, p_action: "confirm", p_input: {} },
    ]);
    expect(rpc.mock.calls[1]).toEqual([
      "admin_change_appointment",
      { p_id: row.id, p_action: "complete", p_input: {} },
    ]);
  });
  it("returns an actionable conflict error and never substitutes a local success", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: "23P01", message: "overlap" } });
    await expect(new SupabaseRepository({ rpc }).create(appointment, "public")).rejects.toThrow(
      "This time slot is no longer available.",
    );
  });
  it("uses a token rather than a caller supplied appointment ID for public exclusion", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ...config, slots: [] }, error: null });
    await new SupabaseRepository({ rpc }).calendar(30, token, "another-appointment");
    expect(rpc).toHaveBeenCalledWith("booking_calendar", {
      p_duration: 30,
      p_token: token,
      p_exclude_id: null,
    });
  });
});
