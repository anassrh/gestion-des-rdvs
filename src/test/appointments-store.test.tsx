import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MockAppointmentsProvider as AppointmentsProvider,
  useMockAppointments as useAppointments,
} from "@/lib/mock-appointments-store";

describe("Shared appointment lifecycle", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);
  it("shares booking tokens, changes status and details, and restores dates after reload", async () => {
    const first = renderHook(() => useAppointments(), { wrapper: AppointmentsProvider });
    let token = "";
    act(() => {
      token = first.result.current.add({
        contactId: "c1",
        start: new Date(2026, 9, 19, 15),
        duration: 30,
        type: "client",
        status: "confirmed",
        reminder: "scheduled",
        notes: "Original",
      });
    });
    expect(first.result.current.appointments.find((a) => a.token === token)?.contactId).toBe("c1");
    act(() =>
      first.result.current.update(token, { duration: 45, type: "technical", notes: "Edited" }),
    );
    act(() => first.result.current.reschedule(token, new Date(2026, 9, 20, 10)));
    expect(first.result.current.appointments.find((a) => a.token === token)?.status).toBe(
      "pending",
    );
    act(() => first.result.current.setStatus(token, "cancelled"));
    first.unmount();
    const restored = renderHook(() => useAppointments(), { wrapper: AppointmentsProvider });
    await waitFor(() =>
      expect(restored.result.current.appointments.some((a) => a.token === token)).toBe(true),
    );
    const appointment = restored.result.current.appointments.find((a) => a.token === token)!;
    expect(appointment.status).toBe("cancelled");
    expect(appointment.duration).toBe(45);
    expect(appointment.start).toBeInstanceOf(Date);
    expect(appointment.history.at(-1)?.at).toBeInstanceOf(Date);
  });
});
