# Product / use-case audit — 16 October 2026

Scope: existing routes, application components, local state, fixtures and tests.
This is a behavioral audit; no visual redesign or backend integration is proposed.
“Yes” means a usable front-end interaction, not a real service. All business data
is mocked/local. The baseline below was recorded before this audit's fixes.

## A. Client/public baseline

| # | Use case | Route | Implemented | Current behavior / missing behavior | Mock? |
|---|---|---|---|---|---|
| 1 | View landing | / | Yes | Headline, benefits, how-it-works, booking CTAs and footer. | Local content |
| 2 | View availability | /, /booking | Partial | Saved rules and occupied slots applied; preview only scans 14 days and clicked slots lose selection. | Yes |
| 3 | Choose date | /booking | Yes | Month navigation; unavailable dates disabled. No explicit fully-booked-range message. | Yes |
| 4 | Choose slot | /booking | Yes | Slot selection with summary; stale selection lacks explanatory feedback. | Yes |
| 5 | Enter personal information | /booking | Yes | First/last name, email, phone, optional company. | Yes |
| 6 | Choose meeting type | /booking | Yes | Five requested types. Select needs an accessible label. | Yes |
| 7 | Add optional note | /booking | Yes | Note saved on appointment. | Yes |
| 8 | Submit request | /booking | Partial | Creates shared appointment and token, but auto-confirms; no pending request journey or final collision recheck. | Yes |
| 9 | View confirmation | /booking/confirmation | Partial | Details shown, but always says confirmed even after cancellation/reschedule. | Yes |
| 10 | View details | /manage/$token | Yes | Contact, date, time, duration and type. | Yes |
| 11 | Confirm appointment | /manage/$token | Partial | Pending fixture can be confirmed; newly booked meetings skip this state. | Yes |
| 12 | Cancel | /manage/$token | Yes | Confirmation dialog, persistent status; misleading real-email wording. | Yes |
| 13 | Reschedule | /manage/$token | Partial | Shared time/status change; uses default duration and does not exclude self or recheck stale slot. | Yes |
| 14 | Current status | /manage/$token | Partial | Badge updates; confirmation page ignores it. | Yes |
| 15 | Return via token | /manage/$token | Partial | Local token lookup works; hydration briefly shows not-found, separate tabs do not sync. | Yes |
| 16 | Add to calendar | /booking/confirmation | Partial | Toast-only calendar preview; no usable calendar file. | Yes |
| 17 | Confirmation state | /booking/confirmation | Partial | Success visual exists; receipt and attendance confirmation conflated. | Yes |
| 18 | Validation | /booking | Partial | Blur errors; submit disabled before users can reveal all errors; duration summary hardcoded. | Yes |
| 19 | Mobile booking | /booking | Yes | Stacked layout, public menu, scrollable dialogs. Long contact strings need wrapping. | Yes |
| 20 | Empty/error/loading | Public routes | Partial | Slot-empty, missing token, root retry and booking spinner; no storage-ready state or submission error recovery. | Yes |

Additional implemented public journeys: About, Contact, Privacy and Terms; home
navigation and footer links. These are informational/demo content, not operational
privacy or legal workflows.

## B. Admin baseline

| # | Use case | Route | Implemented | Current behavior / missing behavior | Mock? |
|---|---|---|---|---|---|
| 1 | Dashboard | /admin | Yes | Welcome, summaries, schedule and quick actions. | Yes |
| 2 | Today | /admin | Yes | Sorted schedule and detail drawer. | Yes |
| 3 | Week | /admin, /admin/calendar | Yes | Week count and default week calendar. | Yes |
| 4 | Pending | /admin, /admin/appointments | Yes | Count and filtered deep link. | Yes |
| 5 | Statistics | /admin | Partial | Counts update; empty storage causes NaN percentages; recent activity static. | Yes |
| 6 | All appointments | /admin/appointments | Yes | Table and card modes. | Yes |
| 7 | Search | /admin/appointments | Yes | Name, email, company; topbar routes to search. | Yes |
| 8 | Filters | /admin/appointments | Partial | Date/status/type/company; new guest companies missing from dropdown. | Yes |
| 9 | Manual creation | Global dialog | Partial | Seed contacts only; no conflicts/date validation, Enter submission or pending option. | Yes |
| 10 | Details | Drawer | Yes | Contact, timing, reminder, note and history. | Yes |
| 11 | Edit | Dialog | Partial | Type/duration/note; duration can overlap another meeting; closed meetings still show table Edit. | Yes |
| 12 | Confirm | Table/drawer | Yes | Pending to confirmed. No transition guard in store. | Yes |
| 13 | Cancel | Table/drawer | Yes | Dialog and shared status; email promise is misleading. | Yes |
| 14 | Reschedule | Dialog | Partial | Same duration/self/stale-selection issues as public. | Yes |
| 15 | Mark completed | Table/drawer | No | Completed fixtures exist, no user action. | — |
| 16 | Calendar | /admin/calendar | Partial | Events and detail access; custom early/late meetings can be clipped. | Yes |
| 17 | Day/week/month | /admin/calendar | Yes | Views, today, date jump, next/previous. Day unnecessarily forced to 720px. | Yes |
| 18 | Contacts | /admin/contacts | Partial | Seed people plus one guest entry per booking, causing duplicates. | Yes |
| 19 | Search contacts | /admin/contacts | Yes | Name/company/email/phone. | Yes |
| 20 | Contact details | Contact drawer | Yes | Contact details and note. | Yes |
| 21 | Contact history | Contact drawer | Partial | Guest bookings split into separate histories; completed/cancelled can appear as next appointment. | Yes |
| 22 | Automations | /admin/automations | Yes | Four cards, trigger, action, stats. | Yes |
| 23 | Enable/disable | /admin/automations | Partial | Persists, but settings preferences are a separate conflicting source. | Yes |
| 24 | Automation details | /admin/automations | Partial | Inline details and edit dialog; no explicit execution result or local test. | Yes |
| 25 | Knowledge library | /admin/knowledge | Yes | List, metrics, metadata. | Yes |
| 26 | Upload mock | /admin/knowledge | Partial | Validates extension/size; instantly indexed, no upload/process sequence. | Yes |
| 27 | Document status | /admin/knowledge | Partial | Seed ready/processing/failed; processing cannot progress on its own; previews all show same policy. | Yes |
| 28 | Delete mock | /admin/knowledge | Yes | Confirmation dialog and local deletion. | Yes |
| 29 | Assistant | /admin/chat | Yes | Input, prompts, history, source panel. | Yes |
| 30 | Send message | /admin/chat | Partial | Appointment queries work; any indexed file unlocks unrelated policy text, no contact queries or response loading. | Yes |
| 31 | Settings | /admin/settings | Partial | Saves profile but names/avatars/headings remain hardcoded. | Yes |
| 32 | Availability | /admin/settings | Yes | Working days and hours applied to public slots. | Yes |
| 33 | Duration | /admin/settings | Partial | Applied to booking creation; summary/rescheduling inconsistent. | Yes |
| 34 | Buffer | /admin/settings | Partial | Public slots honor it; admin creation/edit bypass collisions. | Yes |
| 35 | Booking rules | /admin/settings | Yes | Notice/horizon, with form validation. | Yes |
| 36 | Notification preferences | /admin/settings | Partial | Saved but disconnected from workflows/reminder state. | Yes |
| 37 | Mobile navigation | Admin layout | Yes | Drawer opens and closes after navigation. | Yes |
| 38 | Empty/error/loading | Admin routes | Partial | Search-empty and root error; document/chat lifecycle and recovery missing. | Yes |
| 39 | Toast feedback | Global | Yes | Mutation feedback, some messages overclaim real delivery. | Yes |
| 40 | Confirmation dialogs | Global | Yes | Cancel/delete and reschedule review; no completion action yet. | Yes |

Additional implemented admin interactions: quick-add from topbar/dashboard/calendar,
notifications menu (static), profile menu, demo exit, collapse sidebar, card/table
switch, document re-index and preview, edit workflow name/trigger/action, new/open
conversation, password/2FA explanatory placeholders and SMS placeholder.

## Phase 2: prioritized gaps

| Priority | Gap | Front-end remedy |
|---|---|---|
| P0 | Missing completion and invalid state transitions | Shared guarded lifecycle; completion action and confirmation. |
| P0 | Conflicts/stale slot and reschedule duration | Central mutation checks; actual duration, self exclusion, readable failure feedback. |
| P0 | Conflicting live mock sources | Shared per-key local state and storage events; one workflow toggle source. |
| P0 | Confirmation lies after request/status change | Pending receipt + live status, confirm/cancel/reschedule journey. |
| P1 | Duplicate guest contacts / seed-only creation | Derive stable email-linked contacts and aggregate history; reuse in create/filter. |
| P1 | Activity and notification fixtures disconnected | Derive activity from appointment history. |
| P1 | Documents skip lifecycle / misleading sources | Timed local uploading/processing/indexed/failed flow, retry and document-specific mock excerpts. |
| P1 | Assistant lacks waiting/contact context | Local async response, contact queries and actual indexed-document references. |
| P1 | Profile and reminders/preferences disconnected | Render saved profile; settings and workflow controls share values. |
| P1 | Calendar button, slot deep link, empty horizon | Local ICS export, preserve selected slot, explicit empty state. |
| P1 | Ready/error/mobile edge cases | Hydration guard, storage recovery, no NaN, wrapped text, usable day calendar. |
| P2 | Overlapping legacy/custom events | Collision-column layout may follow; new conflicts will be prevented. |
| P2 | Rich document preview, conversation tools, multi-owner auth | Defer; outside coherent local MVP. |

No route is a dead placeholder, but confirmation, documents, automation execution,
settings/profile and assistant sources are behaviorally incomplete. Security and
SMS controls are intentionally explanatory placeholders. Calendar export is the
main misleading toast-only action. Notifications and demo exit need coherent
labels/behavior. No real service should be inferred from any demo interaction.

## Phase 3 delivery

All P0/P1 items above now have implemented front-end behavior. Original styling,
routes and reusable components were preserved.

| Client cases | Delivered behavior | Still missing intentionally |
|---|---|---|
| 1–7 | Landing, full-horizon availability, slot deep links, date/time selection, personal details, meeting type and optional notes. | Real server availability. |
| 8–9, 17–18 | Validated pending request, receipt with live status/details, loading and retryable errors; submit rechecks conflicts. | Real confirmation delivery. |
| 10–15 | Token details, attendance confirmation, confirmed cancellation, rescheduling using actual duration/self exclusion; status/history consistent everywhere; copy management links. | Secure cross-device token lookup. |
| 16 | Download an importable UTC .ics file with current tentative/confirmed/cancelled status. | Connected calendar accounts or invitation delivery. |
| 19–20 | Responsive booking, wrapping details, scrollable dialogs, availability-empty, storage-loading/recovery, invalid-token and global retry states. | Network/service-specific errors before services exist. |

| Admin cases | Delivered behavior | Still missing intentionally |
|---|---|---|
| 1–8 | Dashboard/today/week/pending/statistics; search, filters and table/cards; no NaN with an empty dataset; dynamic guest-company filters. | Multi-owner reporting. |
| 9–15 | Manual creation for all known contacts with pending/confirmed choice; details/edit/confirm/cancel/reschedule; completion dialog for ended confirmed meetings. Shared validation prevents conflicts and illegal reopening. | Server-side concurrent reservations. |
| 16–17 | Day/week/month, date jump, previous/next/today; hours expand for early/late meetings and day view fits small screens. | Collision columns for overlapping legacy fixtures. |
| 18–21 | Email-linked unique contacts, search/details, combined histories and active-only next appointments. | Contact merge/edit tools beyond requested journeys. |
| 22–24 | Editable workflow cards, canonical enabled state shared with settings, local test run with running/success/failure, retry, last-run time and updated metrics. | n8n, webhooks, automatic scheduled execution. |
| 25–28 | Non-empty PDF/DOCX/TXT up to 20 MB, local uploading → processing → indexed/failed, retry/re-index, current metadata preview and confirmed delete. Root-mounted processing continues across navigation. | File bytes, parsing and real indexing. |
| 29–30 | Conversation history, async simulated replies, appointment/contact queries, explicit matched indexed-document samples and source links. | Real LLM or retrieval. Historical answers remain snapshots. |
| 31–36 | Saved profile reflected in admin/public headings; availability, duration, buffer, notice/horizon; workflow toggles and notification preferences share canonical values. | Real notification scheduling/delivery, SMS, account security. |
| 37–40 | Mobile navigation, readable forms/dialogs, empty/recovery/loading states, mutation feedback and cancel/delete/complete confirmations. | Auth/security flows intentionally remain explanatory. |

### State and consistency

Appointments, workflows, settings, documents and conversations use one shared
per-key local store instead of independent component copies. Functional mutations
validate against the latest same-tab snapshot; same-origin tabs receive storage
updates. Valid saved appointments restore Dates; malformed data uses a recoverable
default, and unavailable/full storage warns that changes are session-only.
Profile data is shared. Notification enablement is derived from workflow rules,
not a second competing toggle source. Reminder state on new/rescheduled/status
changes respects that preference. Existing sent reminders remain historical facts;
turning a preference off does not erase history or execute a delivery scheduler.

Dashboard recent activity and the topbar activity menu derive from appointment
events. Contact histories group seed and guest bookings by normalized email.
All new booking mutations share time/conflict guards. Completed/cancelled meetings
are closed; only confirmed meetings whose end time has passed can be completed.

### Verification

- 30 automated tests pass across 16 route matches, availability constraints,
  lifecycle/date restoration, shared consumers, cross-tab events, malformed-data
  recovery, stale-slot/edit collision rejection, completion, guest deduplication,
  preference linkage, root-level document processing/retry, assistant sources and ICS.
- Browser: landing slot → validation errors → pending request → confirm → reschedule
  → pending → confirm → cancel → admin table with new time/cancelled/no-reminder.
- Browser: completed an ended meeting; contact history showed completed.
- Browser: workflow failure → retry success; failed document retry → indexed while
  navigating to assistant; assistant showed updated source count and contact details.
- Final TypeScript check and production client/SSR build pass. Lint: zero errors,
  10 non-blocking Fast Refresh shared-export warnings. Shared-module edits can
  require a full browser reload during development.
- Mobile 390×844: public booking and assistant have no horizontal page overflow;
  public menu exposes booking/about/contact/admin; admin drawer closes after
  navigation; the day calendar fits without the old 720px minimum.

### Remaining front-end limitations

P2: overlapping legacy/custom fixtures lack separate calendar columns and overnight
spans are not split across days; no rich
file rendering, conversation rename/delete, or contact administration beyond the
requested cases. Browser-local data is not cross-device or transactional; two
simultaneous tabs can still race. Availability uses browser-local time rather than
a configurable owner timezone. Fixture dates remain anchored to the first saved
demo dataset. Conversations preserve answers as snapshots rather than rewriting
past messages when data changes. Document processing and workflow test executions
are simulations, not automatic business event delivery. Security/SMS remain named
placeholders. No Supabase, n8n, webhook, email/SMS, LLM, real indexing or auth added.

## Next database phase (design only; not implemented)

First agree the appointment state machine and owner timezone, then write a schema
migration plus row-access policies and a repository adapter matching the local
store. Validate the adapter with the existing lifecycle/conflict tests before
replacing local persistence. Reserve slots atomically in the database; UI checks
alone cannot prevent concurrent bookings. Add n8n only after this contract works.

Required entities: profiles (owner display data/timezone), contacts (owner + unique
normalized email), appointments (contact, start UTC, duration, type, status, notes,
origin), appointment_management_tokens (hashed token, appointment, expiry/revocation),
appointment_events (actor, event type, prior/new values, timestamp), availability_rules
(working days/hours), booking_preferences (duration, buffer, notice, horizon),
automation_rules (trigger/action/enabled), automation_runs (status/time/error),
notification_deliveries (appointment, channel, scheduled time, result), documents
(file metadata, status, indexed flag), document_chunks (document/order/content and
future embedding), conversations and chat_messages with chat_message_sources.
File bytes belong in object storage later. None of these tables or services is created here.

### Exact proposed table contract

Each owner-controlled row needs owner scoping in the later database phase; IDs
below are relations, not public permission grants. Timestamps should be UTC with
the owner's IANA timezone stored separately. Public token access needs a narrow
server-side lookup/action contract, not unrestricted contact/appointment reads.

| Table | Minimum fields / relationships |
|---|---|
| profiles | id, display_name, role_label, email, timezone |
| contacts | id, owner_id, name, company, role_label, email, normalized_email, phone, notes; unique owner + normalized_email |
| appointments | id, owner_id, contact_id, starts_at, duration_minutes, meeting_type, status, notes, origin, created_at, updated_at |
| appointment_management_tokens | id, appointment_id, token_hash, expires_at, revoked_at |
| appointment_events | id, appointment_id, owner_id, event_type, actor_type, previous_values, new_values, created_at |
| availability_rules | id, owner_id, weekday, start_local_time, end_local_time, enabled |
| booking_preferences | owner_id, duration_minutes, buffer_minutes, minimum_notice_hours, booking_horizon_days |
| automation_rules | id, owner_id, rule_key, name, description, trigger_config, action_config, enabled |
| automation_runs | id, rule_id, appointment_id (optional), started_at, finished_at, status, error; derive success metrics from runs |
| notification_deliveries | id, owner_id, appointment_id, automation_run_id, channel, recipient, scheduled_at, sent_at, status, error |
| documents | id, owner_id, name, storage_path, mime_type, size_bytes, uploaded_at, processing_status, indexed_at, error |
| document_chunks | id, document_id, ordinal, content, metadata; embedding/index fields belong to the later retrieval phase |
| conversations | id, owner_id, title, created_at, updated_at |
| chat_messages | id, conversation_id, role, content, created_at, response_status |
| chat_message_sources | id, message_id, source_type, appointment_id/contact_id/document_id/chunk_id (as applicable), display_title, excerpt_snapshot |

Implement core scheduling tables and owner access rules first. Then introduce an
AppointmentsRepository adapter for add/update/status/reschedule and atomic slot
reservation, preserving the current UI and tests. Add document/chat/automation
persistence in subsequent adapters; real delivery and n8n come last. This audit
adds no migration, connection, credentials or backend infrastructure.
