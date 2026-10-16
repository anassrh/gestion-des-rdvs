import { describe, expect, it } from "vitest";
import { availableSlots } from "@/lib/availability";
import { defaultSettings } from "@/lib/preferences";
import { initialAppointments } from "@/lib/mock-data";

describe("Public availability", () => {
  const now = new Date(2026, 9, 15, 12);
  const monday = new Date(2026, 9, 19);
  it("applies notice, working days, and booking horizon", () => {
    expect(availableSlots(now, [], defaultSettings, now)).toEqual([]);
    expect(availableSlots(new Date(2026, 9, 17), [], defaultSettings, now)).toEqual([]);
    expect(availableSlots(new Date(2027, 0, 18), [], defaultSettings, now)).toEqual([]);
    expect(availableSlots(monday, [], defaultSettings, now)).toContain("09:00");
  });
  it("excludes overlapping meetings including buffer, and releases cancelled slots", () => {
    const meeting = { ...initialAppointments[0]!, start: new Date(2026, 9, 19, 9), duration: 30 };
    const slots = availableSlots(monday, [meeting], defaultSettings, now);
    expect(slots).not.toContain("09:00");
    expect(slots).toContain("09:45");
    expect(
      availableSlots(monday, [{ ...meeting, status: "cancelled" }], defaultSettings, now),
    ).toContain("09:00");
  });
  it("respects custom duration and working hours", () => {
    expect(
      availableSlots(
        monday,
        [],
        { ...defaultSettings, start: "14:00", end: "16:00", duration: 60, buffer: 0 },
        now,
      ),
    ).toEqual(["14:00", "15:00"]);
  });
});
