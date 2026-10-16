# Appointment notifications

Set these unprefixed **server** environment variables locally in `.env.local`
and on the deployment server. Restart the dev server after changing them.

```dotenv
N8N_APPOINTMENT_WEBHOOK_URL=https://drobi.app.n8n.cloud/webhook/meridian-appointments
N8N_ADMIN_NOTIFICATION_EMAIL=your-notification-email@example.com
SUPABASE_SERVICE_ROLE_KEY=your-server-only-supabase-key
APP_PUBLIC_URL=http://localhost:8082
```

Replace `APP_PUBLIC_URL` with the deployed public origin before sending links to
other people: localhost links only work on the machine running RdvFlow. Keep the
existing two public Supabase variables. The server-only Supabase key reads the
private notification recipient; it is never sent to the browser or n8n. No n8n
account credential is needed. Notification variables must not use the `VITE_`
prefix.

Run `supabase/migrations/202610160002_notification_email.sql` once in SQL Editor.
The authenticated owner can then set **Admin notification email** in Admin Settings.
The field is stored in `profiles.notification_email`. Leaving it blank uses
`profiles.email`; `N8N_ADMIN_NOTIFICATION_EMAIL` is the last fallback when neither
saved address exists. Email changes take effect on the next notification without
redeploying. Existing profile RLS and owner-only settings RPC authorization stay
in force; public calendar responses do not expose either address.

The repository sends creation, rescheduling and cancellation through a TanStack
POST server function. It invokes the **same existing Supabase RPC** using the
caller's JWT (or the public management capability) and waits for its successful
response before sending the notification. Existing database validation,
transactions, lifecycle rules and RLS remain authoritative. Rejected writes do
not notify. Confirmation, editing and completion retain their original path and
do not notify. Fixture/local-demo operations do not notify.

`n8n.server.ts` builds the requested JSON from the returned appointment and client
data. Owner display name and timezone come from Supabase; the recipient is read
server-side from that appointment owner's saved profile for every event. Dates/times use the owner's timezone. Public
management actions reuse the current token. For admin mutations, the server issues
an additional valid management token because stored hashes cannot be recovered.
The original links remain valid.

Webhook delivery has a five-second timeout and is best effort, with no automatic
retry or durable queue in this phase. Non-2xx, network and configuration failures
are logged without appointment notes, contact details, tokens, credentials or
response bodies. They do not roll back the committed appointment or report a
failed booking. A 2xx response confirms webhook acceptance, not email delivery;
inspect the n8n execution for downstream mail results.

During the live local verification on 2026-10-16, the supplied production webhook
returned HTTP 404 for creation, rescheduling and cancellation. All three database
operations succeeded and their pages remained usable. The labelled integration
test appointment is cancelled and no longer occupies a slot.
Verify that the workflow is published/active and that the Webhook node's production
URL exactly matches the configured address before expecting notification delivery.

To test manually, create one booking at `/booking` with an inbox you control.
Check Supabase and the n8n production execution for `APPOINTMENT_CREATED`. Retain
the returned management link; use it to move the meeting and check
`APPOINTMENT_RESCHEDULED` with the new date/time, then cancel and check
`APPOINTMENT_CANCELLED`. Confirm/edit/complete must not create executions. If n8n
is unavailable, those database actions should still succeed. Automated tests use
a fake webhook and cover payloads, event selection, commit ordering, missing
configuration, timeout and non-2xx/network failure isolation.

Server environment behavior follows the
[TanStack Start environment documentation](https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables).
