// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { defaultSettings } from "@/lib/preferences";

// Real PostgreSQL parser/PLpgSQL/RLS engine, in memory. Only pgcrypto is replaced
// by deterministic test helpers; these helpers NEVER ship in the migration.
let db: PGlite;
interface RpcResult {
  id: string;
  status: string;
  starts_at: string;
  profile: { display_name: string; email?: string };
  slots: string[];
  appointment: RpcResult;
  appointments: RpcResult[];
  management_token: string;
  contact: { phone: string };
  contacts: unknown[];
  events: { event_type: string }[];
}
const ownerUser = "22222222-2222-4222-8222-222222222222";
async function rpc(name: string, args: unknown[] = [], role = "anon", user = "") {
  await db.exec(`set role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try {
    return (
      await db.query<{ result: RpcResult }>(
        `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as result`,
        args,
      )
    ).rows[0]!.result;
  } finally {
    await db.exec("reset role;");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
  }
}
async function book(email = "guest@example.com", starts?: string) {
  const calendar = await rpc("booking_calendar");
  return rpc("create_booking", [
    {
      first_name: "Guest",
      last_name: "Test",
      email,
      phone: "+33 6 11 22 33 44",
      company: "Example",
      meeting_type: "client",
      notes: "Test",
      starts_at: starts ?? calendar.slots[0],
    },
  ]);
}
describe("Supabase migration and server contracts", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create schema auth; create schema extensions; create role anon; create role authenticated;
      create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create function extensions.digest(text,text) returns bytea language sql immutable as $$ select decode(md5($1)||md5($1||'test'),'hex') $$;
      create function extensions.gen_random_bytes(integer) returns bytea language sql volatile as $$ select decode(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'hex') $$;
      insert into auth.users values('${ownerUser}','benoit.admin@demo.local');`);
    const migration = await readFile(
      new URL("../../supabase/migrations/202610160001_core.sql", import.meta.url),
      "utf8",
    );
    await db.exec(
      migration.replace(
        "create extension if not exists pgcrypto with schema extensions;",
        "-- pgcrypto test helpers installed above",
      ),
    );
    await db.exec(
      await readFile(new URL("../../supabase/setup-owner.sql", import.meta.url), "utf8"),
    );
  }, 60000);
  beforeEach(async () => {
    await db.exec("delete from public.appointments; delete from public.contacts;");
  });
  afterAll(async () => {
    await db?.close();
  });
  it("enables RLS on exactly the seven core tables and keeps public tables inaccessible", async () => {
    const rows = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'",
    );
    expect(rows.rows).toHaveLength(7);
    expect(rows.rows.every((r) => r.relrowsecurity)).toBe(true);
    await db.exec("set role anon;");
    await expect(db.query("select * from public.contacts")).rejects.toThrow(/permission denied/);
    await db.exec("reset role;");
  });
  it("returns safe public configuration without owner email or appointments", async () => {
    const calendar = await rpc("booking_calendar");
    expect(calendar.profile.display_name).toBe("Benoît");
    expect(calendar.profile.email).toBeUndefined();
    expect(calendar.slots.length).toBeGreaterThan(0);
    expect(calendar.appointments).toBeUndefined();
  });
  it("creates a pending booking, hashed capability and event atomically", async () => {
    const result = await book();
    expect(result.appointment.status).toBe("pending");
    expect(result.management_token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.appointment.events[0]!.event_type).toBe("created");
    const token = (
      await db.query<{ token_hash: string }>(
        "select token_hash from public.appointment_management_tokens",
      )
    ).rows[0]!;
    expect(token.token_hash).not.toBe(result.management_token);
    expect(await rpc("get_managed_appointment", [result.management_token])).toMatchObject({
      id: result.appointment.id,
    });
  });
  it("deduplicates email without disclosing or overwriting an existing contact", async () => {
    await book();
    await db.exec("update public.contacts set phone='PRIVATE PHONE',notes='PRIVATE NOTES'");
    const slots = (await rpc("booking_calendar")).slots;
    const second = await rpc("create_booking", [
      {
        first_name: "Another",
        last_name: "Guest",
        email: " GUEST@example.com ",
        phone: "+33 6 99 88 77 66",
        company: "Their input",
        meeting_type: "client",
        starts_at: slots[0],
      },
    ]);
    expect(second.appointment.contact.phone).toBe("+33 6 99 88 77 66");
    expect(JSON.stringify(second)).not.toContain("PRIVATE");
    expect((await db.query("select id from public.contacts")).rows).toHaveLength(1);
    expect(
      (await db.query<{ phone: string }>("select phone from public.contacts")).rows[0]?.phone,
    ).toBe("PRIVATE PHONE");
  });
  it("rejects conflicts and rolls back the second contact and audit rows", async () => {
    const first = await book();
    await expect(book("second@example.com", first.appointment.starts_at)).rejects.toThrow(
      /no longer available/,
    );
    expect((await db.query("select id from public.appointments")).rows).toHaveLength(1);
    expect((await db.query("select id from public.contacts")).rows).toHaveLength(1);
    expect((await db.query("select id from public.appointment_events")).rows).toHaveLength(1);
  });
  it("rejects unknown, expired and revoked tokens and privileged public actions", async () => {
    const first = await book();
    expect(await rpc("get_managed_appointment", ["f".repeat(64)])).toBeNull();
    await expect(rpc("manage_appointment", [first.management_token, "edit", {}])).rejects.toThrow(
      /not permitted/,
    );
    await expect(rpc("admin_snapshot")).rejects.toThrow(/permission denied/);
    await db.exec("update public.appointment_management_tokens set revoked_at=now()");
    expect(await rpc("get_managed_appointment", [first.management_token])).toBeNull();
    await expect(rpc("manage_appointment", [first.management_token, "cancel", {}])).rejects.toThrow(
      /invalid or expired/,
    );
  });
  it("supports owner confirmation, public reschedule and cancellation with fresh admin data", async () => {
    const first = await book();
    await rpc(
      "admin_change_appointment",
      [first.appointment.id, "confirm", {}],
      "authenticated",
      ownerUser,
    );
    const slots = (await rpc("booking_calendar", [null, first.management_token])).slots;
    const changed = await rpc("manage_appointment", [
      first.management_token,
      "reschedule",
      { starts_at: slots[1] },
    ]);
    expect(changed.status).toBe("pending");
    expect(changed.starts_at).not.toBe(first.appointment.starts_at);
    await rpc("manage_appointment", [first.management_token, "cancel", {}]);
    const snapshot = await rpc("admin_snapshot", [], "authenticated", ownerUser);
    expect(snapshot.appointments[0]!.status).toBe("cancelled");
    expect(snapshot.contacts).toHaveLength(1);
    expect(snapshot.appointments[0]!.events.map((e) => e.event_type)).toContain("rescheduled");
    expect(JSON.stringify(snapshot)).not.toContain(first.management_token);
    await expect(
      rpc(
        "admin_change_appointment",
        [first.appointment.id, "confirm", {}],
        "authenticated",
        ownerUser,
      ),
    ).rejects.toThrow(/closed/);
  });
  it("does not give an unrelated authenticated account owner access", async () => {
    await book();
    await expect(
      rpc("admin_snapshot", [], "authenticated", "33333333-3333-4333-8333-333333333333"),
    ).rejects.toThrow(/Administrator/);
    await db.exec("set role authenticated;");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      "33333333-3333-4333-8333-333333333333",
    ]);
    expect((await db.query("select * from public.appointments")).rows).toHaveLength(0);
    await expect(db.query("update public.profiles set display_name='intruder'")).rejects.toThrow(
      /permission denied/,
    );
    await db.exec("reset role;");
  });
  it("persists owner settings and denies public settings changes", async () => {
    const settings = {
      ...defaultSettings,
      name: "Benoît",
      role: "CTO",
      email: "benoit.admin@demo.local",
      timezone: "Europe/Paris",
    };
    await expect(rpc("admin_save_settings", [settings])).rejects.toThrow(/permission denied/);
    await rpc("admin_save_settings", [settings], "authenticated", ownerUser);
    expect((await rpc("booking_calendar")).profile.display_name).toBe("Benoît");
    await expect(
      rpc(
        "admin_save_settings",
        [{ ...settings, timezone: "invalid/timezone" }],
        "authenticated",
        ownerUser,
      ),
    ).rejects.toThrow(/Check profile/);
  });
  it("edits details, rejects premature completion and completes an ended confirmed meeting", async () => {
    const first = await book();
    const changed = await rpc(
      "admin_change_appointment",
      [
        first.appointment.id,
        "edit",
        { duration_minutes: 45, meeting_type: "technical", notes: "Updated" },
      ],
      "authenticated",
      ownerUser,
    );
    expect(changed.events.map((e) => e.event_type)).toContain("edited");
    await rpc(
      "admin_change_appointment",
      [first.appointment.id, "confirm", {}],
      "authenticated",
      ownerUser,
    );
    await expect(
      rpc(
        "admin_change_appointment",
        [first.appointment.id, "complete", {}],
        "authenticated",
        ownerUser,
      ),
    ).rejects.toThrow(/ended confirmed/);
    // Advance only this isolated test record into the past, using the database test owner.
    await db.query("update public.appointments set starts_at=now()-interval '2 days' where id=$1", [
      first.appointment.id,
    ]);
    const completed = await rpc(
      "admin_change_appointment",
      [first.appointment.id, "complete", {}],
      "authenticated",
      ownerUser,
    );
    expect(completed.status).toBe("completed");
    expect(completed.events.map((e) => e.event_type)).toContain("completed");
  });
  it("expires capabilities and cannot retrieve a second appointment with the first token", async () => {
    const first = await book();
    const second = await book("second@example.com");
    expect((await rpc("get_managed_appointment", [first.management_token])).id).not.toBe(
      second.appointment.id,
    );
    await db.query(
      "update public.appointment_management_tokens set expires_at=now()-interval '1 minute' where appointment_id=$1",
      [first.appointment.id],
    );
    expect(await rpc("get_managed_appointment", [first.management_token])).toBeNull();
    expect((await rpc("get_managed_appointment", [second.management_token])).id).toBe(
      second.appointment.id,
    );
  });
});
