import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parse } from "date-fns";
import { CalendarPlus, Check, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/app/site-chrome";
import { meetingLabel, type MeetingType } from "@/lib/mock-data";
import { useAppointments } from "@/lib/appointments-store";
import { StatusBadge } from "@/components/app/primitives";
import { downloadCalendar } from "@/lib/calendar-export";
import { useDemoState } from "@/hooks/use-demo-state";
import { defaultSettings } from "@/lib/preferences";
import { appointmentContact } from "@/lib/contact-selectors";
import { useManagedAppointment } from "@/hooks/use-managed-appointment";
import { usePreferences } from "@/hooks/use-preferences";
import { useRemoteCore } from "@/lib/supabase/core-context";

type Search = {
  token?: string | undefined;
  name?: string | undefined;
  email?: string | undefined;
  date?: string | undefined;
  time?: string | undefined;
  type?: MeetingType | undefined;
};

export const Route = createFileRoute("/booking/confirmation")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: typeof s["token"] === "string" ? s["token"] : undefined,
    name: typeof s["name"] === "string" ? s["name"] : undefined,
    email: typeof s["email"] === "string" ? s["email"] : undefined,
    date: typeof s["date"] === "string" ? s["date"] : undefined,
    time: typeof s["time"] === "string" ? s["time"] : undefined,
    type: typeof s["type"] === "string" ? (s["type"] as MeetingType) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Booking status — RdvFlow" },
      {
        name: "description",
        content: "Your meeting is booked. Add it to your calendar or manage it anytime.",
      },
      { property: "og:title", content: "Booking status — RdvFlow" },
      {
        property: "og:description",
        content: "Your meeting is booked. Add it to your calendar or manage it anytime.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Confirmation,
});

function Confirmation() {
  const s = Route.useSearch();
  const { appointment, loading, error, retry } = useManagedAppointment(s["token"]);
  const settings = usePreferences();
  const remote = useRemoteCore();
  if (loading)
    return (
      <p role="status" className="p-12 text-center">
        Loading appointment…
      </p>
    );
  if (error)
    return (
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 py-16">
          <h1 className="text-2xl font-semibold">Unable to load this booking</h1>
          <p role="alert" className="my-6 text-sm">
            {error}
          </p>
          <Button onClick={() => void retry()}>Retry</Button>
        </main>
      </div>
    );
  if (!appointment)
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-3xl font-semibold">No booking selected</h1>
          <p className="my-6 text-muted-foreground">
            Book a meeting to see your confirmation here.
          </p>
          <Button asChild>
            <Link to="/booking">Book a meeting</Link>
          </Button>
        </main>
      </div>
    );
  const date = appointment.start;
  const rows: [string, string][] = [
    ["Date", format(date, "EEEE d MMMM yyyy")],
    ["Time", format(appointment.start, "HH:mm")],
    ["Duration", `${appointment.duration} minutes`],
    ["Meeting type", meetingLabel(appointment.type)],
    ["Name", appointmentContact(appointment).name],
    ["Email", appointmentContact(appointment).email],
  ];
  const token = s.token ?? appointment.token;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-16 md:py-24">
        <div className="text-center animate-in fade-in zoom-in-95 duration-500">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <h1 className="mt-6 text-3xl font-semibold">
            {appointment.status === "pending"
              ? "Your appointment request is saved"
              : `Your appointment is ${appointment.status}`}
          </h1>
          <div className="mt-3">
            <StatusBadge status={appointment.status} />
          </div>
          <p className="mt-2 text-muted-foreground">
            {appointment.status === "pending"
              ? "Use Manage appointment to confirm attendance, reschedule or cancel. "
              : remote
                ? "Saved securely in Supabase. "
                : "Saved in this browser. "}
            Email reminders are{" "}
            {remote ? "not connected yet" : settings.emailReminder ? "simulated" : "disabled"}.
          </p>
        </div>
        <dl className="surface-card mt-10 divide-y">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-5 py-3.5 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button
            size="lg"
            className="rounded-full"
            onClick={() => {
              downloadCalendar(appointment);
              toast.success("Calendar file created", {
                description:
                  "Import the .ics file into your calendar. No calendar account is connected.",
              });
            }}
          >
            <CalendarPlus className="h-4 w-4" /> Add to calendar
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full bg-card">
            <Link to="/manage/$token" params={{ token }}>
              <Settings2 className="h-4 w-4" /> Manage my appointment
            </Link>
          </Button>
        </div>
        <div className="mt-6 text-center">
          <Button asChild variant="link" className="text-muted-foreground">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
