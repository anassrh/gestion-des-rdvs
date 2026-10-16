import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function rpc(name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.code} ${error.message}`);
  return data;
}
const calendar = await rpc("booking_calendar");
assert.ok(calendar.slots.length);
assert.equal(calendar.profile.email, undefined);
const denied = await client.from("contacts").select("id").limit(1);
assert.ok(denied.error, "Anonymous contact reads must be denied");
assert.equal(await rpc("get_managed_appointment", { p_token: "f".repeat(64) }), null);
console.log("PASS: hosted calendar, safe public profile, contact isolation and invalid token.");

if (process.argv.includes("--booking")) {
  let token;
  try {
    const created = await rpc("create_booking", {
      p_input: {
        first_name: "Integration",
        last_name: "Test",
        email: "supabase-e2e@example.invalid",
        phone: "+33 6 00 00 00 00",
        company: "E2E verification",
        meeting_type: "technical",
        starts_at: calendar.slots[0],
        notes: "Automated integration test; cancelled after verification.",
      },
    });
    token = created.management_token;
    assert.equal(created.appointment.status, "pending");
    assert.match(token, /^[a-f0-9]{64}$/);
    const managed = await rpc("get_managed_appointment", { p_token: token });
    assert.equal(managed.id, created.appointment.id);
    const conflict = await client.rpc("create_booking", {
      p_input: {
        first_name: "Conflict",
        last_name: "Test",
        email: "conflict-e2e@example.invalid",
        phone: "+33 6 00 00 00 01",
        meeting_type: "technical",
        starts_at: calendar.slots[0],
      },
    });
    assert.ok(conflict.error, "An occupied slot must reject a second booking");
    await rpc("manage_appointment", { p_token: token, p_action: "confirm", p_input: {} });
    const next = await rpc("booking_calendar", { p_token: token });
    const moved = await rpc("manage_appointment", {
      p_token: token,
      p_action: "reschedule",
      p_input: { starts_at: next.slots.find((s) => s !== managed.starts_at) },
    });
    assert.equal(moved.status, "pending");
    assert.ok(moved.events.some((e) => e.event_type === "rescheduled"));
    console.log(
      "PASS: hosted creation, token lookup, conflict rejection, confirmation, rescheduling and audit.",
    );
  } finally {
    if (token) {
      const cancelled = await rpc("manage_appointment", {
        p_token: token,
        p_action: "cancel",
        p_input: {},
      });
      assert.equal(cancelled.status, "cancelled");
      console.log(
        "PASS: cancellation persisted. One labelled cancelled test booking remains for admin verification.",
      );
    }
  }
}
