import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { addMinutes, format, isSameDay, isSameWeek, isAfter, subDays } from "date-fns";
import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock3,
  Hourglass,
  PercentCircle,
  Plus,
  Repeat2,
  Sparkles,
  X,
} from "lucide-react";
import {
  Initials,
  SectionCard,
  StatCard,
  StatusBadge,
  StatusDot,
} from "@/components/app/primitives";
import { AppointmentDrawer } from "@/components/app/appointment-drawer";
import { NewAppointmentDialog } from "@/components/app/new-appointment-dialog";
import { useAppointments } from "@/lib/appointments-store";
import { appointmentActivity } from "@/lib/activity";
import { usePreferences } from "@/hooks/use-preferences";
import {
  contactById,
  meetingShort,
  recentActivity,
  type ActivityItem,
  type AppointmentStatus,
} from "@/lib/mock-data";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — RdvFlow Admin" },
      {
        name: "description",
        content: "Today’s schedule, upcoming meetings and activity at a glance.",
      },
      { property: "og:title", content: "Dashboard — RdvFlow Admin" },
      {
        property: "og:description",
        content: "Today’s schedule, upcoming meetings and activity at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

const activityIcon: Record<ActivityItem["kind"], typeof Check> = {
  confirm: Check,
  reschedule: Repeat2,
  reminder: BellRing,
  cancel: X,
  booking: CalendarPlus,
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { appointments } = useAppointments();
  const settings = usePreferences();
  const recentActivity = appointmentActivity(appointments);
  const [selected, setSelected] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const now = new Date();
  const today = appointments
    .filter((a) => isSameDay(a.start, now) && a.status !== "cancelled")
    .sort((a, b) => +a.start - +b.start);
  const week = appointments.filter((a) => isSameWeek(a.start, now, { weekStartsOn: 1 }));
  const pending = appointments.filter((a) => a.status === "pending");
  const nextToday = today.find((a) => isAfter(a.start, now));
  const lastWeek = appointments.filter((a) =>
    isSameWeek(a.start, subDays(now, 7), { weekStartsOn: 1 }),
  ).length;
  const recent = appointments.filter((a) => a.start >= subDays(now, 30) && a.start <= now);
  const cancelRate = Math.round(
    (recent.filter((a) => a.status === "cancelled").length / Math.max(1, recent.length)) * 100,
  );
  const upcoming = appointments
    .filter((a) => isAfter(a.start, now) && a.status !== "cancelled" && a.status !== "completed")
    .sort((a, b) => +a.start - +b.start)
    .slice(0, 6);
  const statuses: AppointmentStatus[] = ["pending", "confirmed", "completed", "cancelled"];
  const counts = statuses.map((s) => ({ s, n: appointments.filter((a) => a.status === s).length }));
  const total = Math.max(1, appointments.length);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold" suppressHydrationWarning>
          {greeting()}, {settings.name}.
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Here’s what’s happening with your appointments.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Appointments today"
          value={today.length}
          hint={
            nextToday ? `Next at ${format(nextToday.start, "HH:mm")}` : "No more meetings today"
          }
          icon={CalendarCheck2}
        />
        <StatCard
          label="This week"
          value={week.length}
          hint={`${week.length - lastWeek >= 0 ? "+" : ""}${week.length - lastWeek} vs last week`}
          icon={CalendarDays}
        />
        <StatCard
          label="Pending confirmations"
          value={pending.length}
          hint="Awaiting guest reply"
          icon={Hourglass}
        />
        <StatCard
          label="Cancellation rate"
          value={`${cancelRate}%`}
          hint="Last 30 days"
          icon={PercentCircle}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title="Upcoming appointments"
          action={
            <Link
              to="/admin/appointments"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <ul className="-mx-2 divide-y">
            {upcoming.map((a) => {
              const c = a.guest ?? contactById(a.contactId);
              return (
                <li key={a.id}>
                  <button
                    onClick={() => setSelected(a.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Initials name={c.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.company} · {meetingShort(a.type)}
                      </div>
                    </div>
                    <div className="hidden text-right text-sm tabular-nums sm:block">
                      <div>{format(a.start, "HH:mm")}</div>
                      <div className="text-xs text-muted-foreground">
                        {isSameDay(a.start, now) ? "Today" : format(a.start, "EEE d MMM")}
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <SectionCard
          title="Today’s schedule"
          action={<span className="text-xs text-muted-foreground">{format(now, "EEE d MMM")}</span>}
        >
          {today.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Your day is clear.</p>
          ) : (
            <ol className="space-y-1">
              {today.map((a) => {
                const c = a.guest ?? contactById(a.contactId);
                return (
                  <li key={a.id} className="flex gap-4">
                    <span className="w-12 pt-2.5 text-xs text-muted-foreground tabular-nums">
                      {format(a.start, "HH:mm")}
                    </span>
                    <button
                      onClick={() => setSelected(a.id)}
                      className="flex-1 rounded-lg border-l-2 border-primary bg-secondary px-3 py-2 text-left transition-colors hover:bg-accent"
                    >
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {meetingShort(a.type)} · {format(a.start, "HH:mm")}–
                        {format(addMinutes(a.start, a.duration), "HH:mm")}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard title="Status overview">
          <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
            {counts.map(({ s, n }) => (
              <div
                key={s}
                style={{ width: `${(n / total) * 100}%` }}
                className={
                  {
                    pending: "bg-status-pending",
                    confirmed: "bg-status-confirmed",
                    completed: "bg-status-completed",
                    cancelled: "bg-silver",
                  }[s]
                }
              />
            ))}
          </div>
          <ul className="mt-5 space-y-3">
            {counts.map(({ s, n }) => (
              <li key={s} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 capitalize">
                  <StatusDot status={s} />
                  {s}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {n} · {Math.round((n / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Recent activity">
          {!recentActivity.length && (
            <p className="text-sm text-muted-foreground">No appointment activity yet.</p>
          )}
          <ul className="space-y-4">
            {recentActivity.map((r) => {
              const I = activityIcon[r.kind];
              return (
                <li key={r.id} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <I className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <div>
                    <div className="text-sm">{r.text}</div>
                    <div className="text-xs text-muted-foreground">{r.ago}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <SectionCard title="Quick actions">
          <div className="grid gap-2">
            <QuickAction icon={Plus} label="Create appointment" onClick={() => setNewOpen(true)} />
            <QuickAction icon={CalendarDays} label="Open calendar" to="/admin/calendar" />
            <QuickAction
              icon={Clock3}
              label="View pending appointments"
              to="/admin/appointments"
              search={{ status: "pending" }}
            />
            <QuickAction icon={Sparkles} label="Open AI Assistant" to="/admin/chat" />
          </div>
        </SectionCard>
      </div>

      <AppointmentDrawer id={selected} onClose={() => setSelected(null)} />
      <NewAppointmentDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  to,
  search,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  to?: "/admin/calendar" | "/admin/appointments" | "/admin/chat";
  search?: { status: string };
  onClick?: () => void;
}) {
  const cls =
    "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
  const inner = (
    <>
      <Icon className="h-4 w-4" />
      {label}
      <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
    </>
  );
  if (to)
    return (
      <Link to={to} search={search as never} className={cls}>
        {inner}
      </Link>
    );
  return (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
