import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDemoState } from "@/hooks/use-demo-state";
import { usePreferences } from "@/hooks/use-preferences";
import { defaultSettings } from "@/lib/preferences";
import {
  MockAppointmentsProvider as AppointmentsProvider,
  useMockAppointments as useAppointments,
} from "@/lib/mock-appointments-store";
import { allContacts, contactMeetings } from "@/lib/contact-selectors";
import { contacts, initialAppointments, initialAutomations, initialDocs } from "@/lib/mock-data";
import { availableSlots } from "@/lib/availability";
import { appointmentActivity } from "@/lib/activity";
import { mockAnswer } from "@/lib/mock-assistant";
import { calendarFile } from "@/lib/calendar-export";

describe("Product journeys", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 16, 12));
    localStorage.clear();
    localStorage.setItem("meridian-appointments-v1", "[]");
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  const wrapper = AppointmentsProvider;
  const booking = (start: Date) => ({
    contactId: "c1",
    start,
    duration: 30,
    type: "client" as const,
    status: "pending" as const,
    reminder: "scheduled" as const,
    notes: "Demo",
  });

  it("keeps multiple settings consumers and another-tab updates synchronized", () => {
    const first = renderHook(() => useDemoState("meridian-settings-v1", defaultSettings));
    const second = renderHook(() => useDemoState("meridian-settings-v1", defaultSettings));
    act(() => first.result.current[1]((s) => ({ ...s, duration: 60 })));
    expect(second.result.current[0].duration).toBe(60);
    act(() => {
      localStorage.setItem(
        "meridian-settings-v1",
        JSON.stringify({ ...defaultSettings, duration: 45 }),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: "meridian-settings-v1" }));
    });
    expect(first.result.current[0].duration).toBe(45);
    expect(second.result.current[0].duration).toBe(45);
  });
  it("recovers malformed stored settings instead of crashing", () => {
    localStorage.setItem("meridian-settings-v1", JSON.stringify({ duration: 0 }));
    const state = renderHook(() => useDemoState("meridian-settings-v1", defaultSettings));
    expect(state.result.current[0]).toEqual(defaultSettings);
    expect(state.result.current[2]).toBe(true);
  });
  it("rejects stale bookings and duration edits that overlap, preserving original data", () => {
    const store = renderHook(useAppointments, { wrapper });
    let first = "";
    act(() => {
      first = store.result.current.add(booking(new Date(2026, 9, 19, 9)), "public");
    });
    expect(() =>
      act(() => store.result.current.add(booking(new Date(2026, 9, 19, 9)), "public")),
    ).toThrow(/overlap/);
    act(() => {
      store.result.current.add(booking(new Date(2026, 9, 19, 10)));
    });
    expect(() =>
      act(() =>
        store.result.current.update(first, { duration: 90, type: "client", notes: "Conflict" }),
      ),
    ).toThrow(/overlap/);
    expect(store.result.current.appointments[0]?.duration).toBe(30);
  });
  it("deduplicates repeat guests and shares request, confirmation, cancellation and activity", () => {
    const store = renderHook(useAppointments, { wrapper });
    let first = "";
    const guest = { ...contacts[0]!, email: contacts[0]!.email.toUpperCase() };
    act(() => {
      first = store.result.current.add({ ...booking(new Date(2026, 9, 19, 9)), guest }, "public");
      store.result.current.add({ ...booking(new Date(2026, 9, 19, 10, 30)), guest }, "public");
    });
    expect(allContacts(store.result.current.appointments)).toHaveLength(contacts.length);
    expect(contactMeetings(contacts[0]!, store.result.current.appointments)).toHaveLength(2);
    act(() => store.result.current.setStatus(first, "confirmed"));
    act(() => store.result.current.setStatus(first, "cancelled"));
    expect(
      appointmentActivity(store.result.current.appointments).some((a) => /cancelled/.test(a.text)),
    ).toBe(true);
    expect(() => act(() => store.result.current.setStatus(first, "confirmed"))).toThrow(/closed/);
    expect(() =>
      act(() => store.result.current.reschedule(first, new Date(2026, 9, 20, 9))),
    ).toThrow(/Closed/);
  });
  it("marks ended confirmed meetings completed and prevents future completion", () => {
    const past = {
      ...initialAppointments[0]!,
      start: new Date(2026, 9, 15, 9),
      status: "confirmed",
    };
    localStorage.setItem("meridian-appointments-v1", JSON.stringify([past]));
    const store = renderHook(useAppointments, { wrapper });
    act(() => store.result.current.setStatus(past.id, "completed"));
    expect(store.result.current.appointments[0]?.status).toBe("completed");
    let future = "";
    act(() => {
      future = store.result.current.add({
        ...booking(new Date(2026, 9, 19, 9)),
        status: "confirmed",
      });
    });
    expect(() => act(() => store.result.current.setStatus(future, "completed"))).toThrow(/ended/);
  });
  it("uses the actual reschedule duration and allows the appointment's own free slot", () => {
    const a = { ...initialAppointments[0]!, start: new Date(2026, 9, 19, 9), duration: 60 };
    expect(
      availableSlots(a.start, [], { ...defaultSettings, duration: a.duration }, new Date()),
    ).toContain("09:00");
    expect(availableSlots(a.start, [a], defaultSettings, new Date())).not.toContain("09:00");
    const late = new Date(2026, 9, 19, 17);
    expect(
      availableSlots(late, [], { ...defaultSettings, duration: 90 }, new Date()),
    ).not.toContain("17:00");
  });
  it("workflow toggles are the canonical notification preferences", () => {
    const state = renderHook(() => {
      const workflows = useDemoState("meridian-automations-v1", initialAutomations);
      const preferences = usePreferences();
      return { workflows, preferences };
    });
    act(() =>
      state.result.current.workflows[1]((rows) =>
        rows.map((a) => (a.id === "w2" ? { ...a, enabled: false } : a)),
      ),
    );
    expect(state.result.current.preferences.emailReminder).toBe(false);
  });
  it("processes mock uploads and retryable failure at root, without document page mounting", () => {
    const state = renderHook(() => useDemoState("meridian-docs-v1", initialDocs), { wrapper });
    act(() =>
      state.result.current[1]([
        {
          ...initialDocs[0]!,
          id: "test-file",
          status: "uploading",
          indexed: false,
          chunks: 0,
          stageStartedAt: Date.now(),
          simulateFailure: true,
        },
      ]),
    );
    act(() => vi.advanceTimersByTime(900));
    expect(state.result.current[0][0]?.status).toBe("processing");
    act(() => vi.advanceTimersByTime(900));
    expect(state.result.current[0][0]?.status).toBe("failed");
    act(() =>
      state.result.current[1]((rows) =>
        rows.map((d) => ({
          ...d,
          status: "processing",
          simulateFailure: false,
          stageStartedAt: Date.now(),
        })),
      ),
    );
    act(() => vi.advanceTimersByTime(900));
    expect(state.result.current[0][0]?.indexed).toBe(true);
  });
  it("does not cite unrelated or deleted documents and can answer contact questions", () => {
    expect(
      mockAnswer("What does the onboarding document say?", [], [initialDocs[2]!]).text,
    ).toMatch(/No matching/);
    expect(
      mockAnswer("What does the onboarding document say?", [], [initialDocs[0]!]).sourceId,
    ).toBe("d1");
    expect(mockAnswer("What is Marie Dupont's email?", [], []).text).toContain(contacts[0]!.email);
  });
  it("exports an importable local calendar file with current tentative or cancelled status", () => {
    const a = { ...initialAppointments[0]!, status: "pending" as const };
    expect(calendarFile(a)).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(calendarFile(a)).toContain("STATUS:TENTATIVE");
    expect(calendarFile({ ...a, status: "cancelled" })).toContain("STATUS:CANCELLED");
  });
});
