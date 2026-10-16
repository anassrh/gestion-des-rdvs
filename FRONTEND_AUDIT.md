# Front-end audit and delivery notes

Historical implementation audit. See [PRODUCT_AUDIT.md](./PRODUCT_AUDIT.md) for
the subsequent product audit, updated behavior and remaining limitations.

## Initial state

| Area | Finding |
| --- | --- |
| Existing routes | Landing, booking, confirmation, token management, admin dashboard, appointments, calendar, about, contact, privacy and terms. |
| Missing routes | Contacts, Automations, Knowledge, AI Assistant and Settings. Sidebar links existed but had no pages. |
| Components | Site header/footer, admin sidebar/topbar, page/section headers, statistics, initials, status badges/dots, search, empty state, calendar/time selector, creation/detail/reschedule/confirmation dialogs. Broad Radix/shadcn library includes tables, sheets, switches, toast and skeleton primitives. |
| Styling | Tailwind 4 theme variables, system/SF/Inter typography, warm neutrals, paprika accent, subtle borders/shadows. Preserved the existing visual direction. |
| Navigation | Public header/footer; persistent collapsible admin sidebar, topbar search, quick create, notifications/profile menus. Public links were hidden on mobile without an alternative. |
| Mock data | Eight professional contacts including the requested names, 18 date-relative appointments, four workflows, five documents, activity fixtures and deterministic availability. |
| Working | Calendar/form validation, dashboard schedule, appointment search/filter/table/card views, status changes, day/week/month calendar and creation/reschedule/cancel dialogs. |
| Incomplete / UX | Booking never created an appointment. Confirmation linked to a seeded guest. Unknown tokens silently showed another guest. Public and admin state were isolated. Edit opened a read-only drawer. Refresh lost changes. Global search did not update an already-mounted appointments page. Dashboard hints included hardcoded comparisons and past meetings. |
| Startup | Node 22.11 was below Vite/TanStack requirements. Rolldown Windows binding was absent; npm under the old runtime continued omitting optional packages. Bun lockfile existed although README instructed npm; no Bun-only code was present. |
| Architecture | Good file routing and reusable UI; provider scoped only to admin, static contact lookups, no durable mock state. Strict TypeScript errors in search validation and unchecked array accesses. |
| Duplication / excess | Broad unused starter UI catalog: charts, carousel, command, OTP, menus, etc. Retained exported primitives for compatibility. No replacement design system added. Format fixes align app files with configured lint rules. |

## Delivered

- Five missing admin routes integrated into the existing layout.
- Contacts: search, company/email/phone, counts, last/next appointments, detail drawer and clickable meeting history.
- Automations: four cards, trigger/action, state, sample execution metrics, persisted editing and toggles.
- Knowledge: drag/drop or file picker, PDF/DOCX/TXT and size validation, metadata, processing/index state, mock chunks, preview, re-index and confirmed deletion.
- Assistant: saved conversation history, suggested prompts, input, local appointment answers, sample references and desktop source panel.
- Settings: profile, hours/days, duration/buffer, notice/horizon, reminder/automation preferences, SMS and security placeholders.
- Shared persistent appointment state, actual booking tokens, confirm/cancel/reschedule/edit operations, invalid-token state and edit history.
- Public availability applies saved preferences and excludes appointments plus buffer. Admin creation supports custom times.
- Mobile navigation, auto-closing admin sidebar, scrollable dialogs, requested base palette and dark primary-button text for contrast.
- npm lockfile, pinned local Node 22.23.3, engines declaration and verified native-dependency setup. Removed competing Bun configuration; no downgrades or Git history changes.

## Validation

Dev server starts on Windows x64 using local Node 22.23.3. Regression coverage
includes 16 routes, notice/horizon/working-hour rules, conflicts/buffer and shared
appointment changes with stored Date restoration. TypeScript, production build
and lint are checked. Lint has no errors; shared exports produce non-blocking
Fast Refresh warnings.

Browser checks exercised booking/confirmation/token links, admin navigation,
workflow editing, re-indexing, assistant answers and mobile sidebar/settings.
390px viewport checks showed no page-level horizontal overflow.

## Limitations and next step

All state stays in this browser. No authentication, authorization, cross-device
sharing, server collision protection, notifications, parsing, retrieval or real AI.
Seed dates are relative to initial load; saved fixtures remain until reset.
Overlapping custom admin events do not have separate calendar collision columns.
Recent activity and workflow success metrics are sample fixtures. Informational
and legal pages remain demo copy.

Next define contacts/appointments/availability schemas, timezone rules, owner
access policies and token lifecycle; then replace the store with Supabase and
transactional slot reservation. Connect n8n to appointment events and real
notification providers after the data contract is stable. Document storage,
indexing and a retrieval-backed assistant should follow separately. None is
connected in this delivery.
