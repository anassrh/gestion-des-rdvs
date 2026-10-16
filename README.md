# RdvFlow

Professional appointment scheduling demo using React 19, TypeScript, TanStack
Start, Vite 8, Tailwind 4 and Radix. Existing Lovable design and routing are preserved.

## Development on Windows / Node 22

Use npm; package-lock.json is authoritative. Bun is not required. Node 22.23.3
is pinned in .nvmrc and as a project-local dev dependency. npm scripts use that
runtime without replacing your system installation. Use Node 22.13+ for the full
toolchain (Vite/TanStack require at least 22.12).

```powershell
npm ci
npm run setup
npm run dev
```

Setup restores optional native dependencies under project-local Node and verifies
Rolldown loads. System Node 22.11 can cause npm to omit those packages because
their engine checks fail. The matching Windows x64 Rolldown binding is also pinned
as an optional dependency. Do not omit optional dependencies or disable install
scripts. For an existing checkout, npm install can replace npm ci above.

Open the URL printed by Vite (8080 by default, or the next free port). Ctrl+C stops it.
No dependencies were downgraded. The Lovable wrapper already provides all Vite
plugins; do not duplicate them. Its existing Cloudflare build target is preserved.

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
npm run preview
```

## Supabase and routes

- Public: /, /booking, /booking/confirmation?token=…, /manage/<token>.
- Admin: /admin, /admin/appointments, /admin/calendar, /admin/contacts,
  /admin/automations, /admin/knowledge, /admin/chat, /admin/settings.
- Information: /about, /contact, /privacy, /terms.

Set the two public Supabase variables from `.env.example` in ignored `.env.local`.
Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for the migration, owner Auth setup,
RLS policies, architecture, verification and the next n8n step. The supplied project
is configured locally; restart Vite after changing its environment.

Configured runtime uses Supabase for appointments, contacts, owner profile,
availability and booking preferences. Owner administration uses Supabase Auth.
Public bookings start pending and receive a private management capability.
Database transactions validate availability and prevent overlapping reservations.
Other devices refresh every 15 seconds; local mutations refresh immediately.
There is no runtime fallback to local records when Supabase fails.

Without Supabase variables, the explicit fixture demo remains available. The unit
test environment also uses this adapter. Historical local appointments are not
automatically migrated or mixed into the real database.

Appointment creation, rescheduling and cancellation now send server-side n8n
notifications after a successful database operation; see
[N8N_INTEGRATION.md](./N8N_INTEGRATION.md) for configuration and testing. Scheduled
reminders, automation controls, documents/indexing and the AI assistant remain
simulated. No direct email/SMS sender or LLM is connected. The calendar button
creates a real `.ics` download. Earlier [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md) and
[PRODUCT_AUDIT.md](./PRODUCT_AUDIT.md) describe the historical frontend/local phase;
the Supabase guide supersedes their backend limitations.
The [Lovable project](https://lovable.dev/projects/20f6c4fa-a541-4a32-8809-295f0c3e6b65)
remains connected; do not rewrite published Git history.
