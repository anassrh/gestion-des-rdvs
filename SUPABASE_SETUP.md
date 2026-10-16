# Supabase appointment persistence

The existing interface and routes now use Supabase for appointments, contacts,
owner profile, availability rules and booking preferences. The official JavaScript
client calls a repository; components retain the existing appointment-store API.
Writes execute inside narrow PostgreSQL functions. No service-role credential is
required in the app. These functions provide the server-side transaction boundary
without introducing a privileged TanStack server credential.

## Configuration and dashboard setup

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` to the project's URL and publishable key. Restart Vite
after changing environment variables. `.env.local` is ignored by Git. Never add a
service-role key to a `VITE_` variable.

The following steps have been reported completed for the configured project:

1. SQL Editor: execute `supabase/migrations/202610160001_core.sql` once.
2. Authentication → Users → Add user: create `benoit.admin@demo.local`, choose the
   password privately and confirm the email. This local demonstration address
   cannot receive invitations or password-reset mail.
3. SQL Editor: execute `supabase/setup-owner.sql`. This links the existing Auth
   user to the seeded owner. It does not create or change a password.
4. Open `/admin` and sign in. Public booking does not need an account.

No further SQL is required for this implementation. The migration is a one-time
initial migration, not a script to rerun over an existing schema. Future changes
should use new migrations. Do not enable anonymous table policies or broad write
grants to resolve an application error.

## Tables and access policies

All seven tables explicitly enable RLS. Authenticated SELECT policies compare the
owner's `profiles.auth_user_id` with `auth.uid()`. An unrelated signed-in user gets
no owner records. No browser role receives direct INSERT/UPDATE/DELETE grants.
Each write RPC rechecks owner authentication or the management capability.

| Table                           | Anonymous access                                                               | Authenticated owner access                                             |
| ------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `profiles`                      | Safe name, role and timezone through `booking_calendar` only                   | Owner SELECT; controlled settings RPC                                  |
| `contacts`                      | No listing or direct reads; booking transaction finds/creates normalized email | Owner SELECT and contact history from snapshot                         |
| `appointments`                  | No listing; creation RPC and single-appointment capability RPCs                | Owner SELECT and controlled mutation RPCs                              |
| `appointment_management_tokens` | No table privileges                                                            | No table privileges; explicit false table policy; token issue RPC only |
| `appointment_events`            | No direct reads; own event summaries through capability                        | Owner SELECT; trigger-generated events                                 |
| `availability_rules`            | Safe projection through calendar RPC                                           | Owner SELECT; settings RPC                                             |
| `booking_preferences`           | Scheduling fields through calendar RPC                                         | Owner SELECT; settings RPC                                             |

The single profile contains an additional `auth_user_id` link. Appointments contain
an additional `guest_details` snapshot: submitting an existing email cannot reveal
or overwrite that contact's canonical phone, name or notes. Public responses use
the submitted snapshot; admin responses use the canonical contact. The unique
constraint `(owner_id, normalized_email)` prevents duplicate contacts.

Public RPCs are `booking_calendar`, `create_booking`, `get_managed_appointment`
and `manage_appointment`. Authenticated owner RPCs are `admin_snapshot`,
`admin_create_appointment`, `admin_change_appointment`,
`admin_issue_management_token` and `admin_save_settings`.

Internal helpers live in a non-exposed private schema with no browser usage or
execution grants. Security-definer entry points use an empty search path and
explicit execute grants. Public clients cannot choose the initial booking status
or arbitrarily change duration or owner.

## Transactions, capabilities and synchronization

Creation validates the input, checks server-calculated availability, finds or
creates the normalized contact, inserts a pending appointment, issues a token and
records an event in one transaction. Every appointment mutation locks the owner
row before checking overlaps, serializing concurrent writes, including different
but overlapping start times and buffer periods. A rejected transaction rolls back
its contact, appointment, token and event changes.

Raw management tokens use 32 cryptographically random bytes. Only their SHA-256
hashes are stored. Expired or revoked tokens authorize nothing. A capability
permits view, confirm, cancel and reschedule for exactly one appointment; editing
details and completing meetings require owner authentication. Management URLs
should be treated as private bearer links. Pages set `Referrer-Policy` through
the no-referrer meta policy. Admin copy-link issues an additional valid token;
it cannot recover an earlier raw token. Existing valid links remain usable.

Rescheduling returns attendance to pending. Cancelled/completed appointments stay
closed. Only an ended, confirmed meeting can be completed. Profile timezone
controls working-hour calculations; dates are stored as `timestamptz`, and the
interface displays slots in the visitor's browser timezone.

Mutations refresh affected queries immediately. Other tabs/devices refresh every
15 seconds and on focus. This is polling, not a Realtime subscription. Core
records are held in query memory and Supabase, not browser-local persistence.
Supabase Auth persists its own session normally. Logout removes privileged query
data. A server error shows an error state; it does not switch to mock records.

## Real and simulated features

Real pages: `/`, `/booking`, `/booking/confirmation`, `/manage/<token>`, `/admin`,
`/admin/appointments`, `/admin/calendar`, `/admin/contacts`, `/admin/settings`.
The landing page's preview uses real availability. Settings save owner identity,
timezone, working days/hours, duration, buffer, minimum notice and horizon.

Still simulated: automation execution, notification preferences and delivery,
document upload/indexing, conversations and assistant responses. The assistant
explicitly uses fixture appointments rather than querying the live core data.
No n8n endpoint, webhook, email/SMS sender or AI service has been introduced.
Calendar export creates a real `.ics` download.

If Supabase variables are absent, the explicitly unconfigured demo uses the old
fixture adapter. Unit tests select that adapter with Vite's test mode. Configured
runtime errors never activate it. Historical local records are not automatically
uploaded or mixed into Supabase. The seed creates one owner and default rules,
with no fake appointments or contacts.

## Verification

Run `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
Final checks on 2026-10-16: 49 tests passed (30 existing and 19 new), TypeScript
passed, lint passed with zero errors and 12 Fast Refresh warnings, production
client/server build passed, and `git diff --check` passed. Settings save was also
verified through the authenticated browser and returned the Supabase success
message. Environment-file Git exclusion was verified.
The SQL suite uses PGlite's PostgreSQL parser, PL/pgSQL and RLS engine. Its isolated
test-only crypto substitutes are not cryptographic tests and never appear in the
hosted migration, which uses pgcrypto.

Read-only hosted check:

```powershell
node --env-file=.env.local scripts/check-supabase.mjs
```

Hosted mutation check (creates one labelled test booking and cancels it in a
finally block; preserves its contact and audit history):

```powershell
node --env-file=.env.local scripts/check-supabase.mjs --booking
```

The hosted check has passed: public availability, safe profile, contact read
denial, invalid-token rejection, creation, collision rejection, token lookup,
confirmation, rescheduling, audit and persisted cancellation. A cancelled record
for `supabase-e2e@example.invalid` remains intentionally for admin inspection.

The browser journey was also verified against the hosted project on 2026-10-16:
public booking for `browser-e2e@example.invalid`, pending confirmation, owner
sign-in, admin confirmation and detail editing, confirmed calendar entry, one
contact, client rescheduling from 19 October 10:30 to 20 October 11:15, updated
admin time/pending state, client cancellation and persisted admin cancellation
after reload. Both labelled test appointments are cancelled; they preserve audit
history and do not occupy bookable slots. Completion of an ended confirmed
meeting is covered by the isolated PostgreSQL test rather than manipulating
production dates. No browser console errors were observed during verification.

For the browser acceptance journey:

1. Open `/booking`; choose an available slot and submit a new guest.
2. Verify the pending confirmation and retain its private management link.
3. Sign in at `/admin` with the linked owner account.
4. Find the same booking in Appointments and confirm it.
5. Check its confirmed state in Calendar and the single contact in Contacts.
6. Open its management link and move it to another offered slot.
7. Check the new time and pending state in admin after refresh/polling.
8. Cancel from the management page.
9. Check cancelled status, dashboard totals and activity in admin.
10. Reload the pages: persistence must survive a full reload.

## Files and next integration

SQL: `supabase/migrations/202610160001_core.sql`, `supabase/setup-owner.sql`.
Client/repository/mappers/provider: `src/lib/supabase/`.
Existing store boundary: `src/lib/appointments-store.tsx`,
`src/lib/appointments-contract.ts`; isolated fixture implementation:
`src/lib/mock-appointments-store.tsx`.
Hooks: `use-availability`, `use-managed-appointment`, `use-contacts`,
`use-preferences`. Auth screen: `src/components/app/admin-access.tsx`.
Routes/dialogs retain the current design and await remote mutations before
showing success. Tests: `supabase-repository.test.ts`, `supabase-sql.test.ts`, plus
the existing routing and product journey suites.

Next n8n step, after accepting this lifecycle: define an authenticated event
contract with event ID, appointment ID, event type and schema version, then add a
durable server-side outbox/dispatcher with retries and idempotency. n8n should
consume committed events and fetch authorized details server-side. Do not put an
n8n credential or an unauthenticated delivery webhook in browser code. Configure
notification providers and consent rules only in that later phase. Public launch
also needs an explicit abuse/rate-limit policy for anonymous creation.

References: [Supabase database functions](https://supabase.com/docs/guides/database/functions),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[password authentication](https://supabase.com/docs/guides/auth/passwords).
