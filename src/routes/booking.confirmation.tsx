import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parse } from "date-fns";
import { CalendarPlus, Check, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/app/site-chrome";
import { initialAppointments, meetingLabel, type MeetingType } from "@/lib/mock-data";

type Search = { name?: string; email?: string; date?: string; time?: string; type?: MeetingType };

export const Route = createFileRoute("/booking/confirmation")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    name: typeof s.name === "string" ? s.name : undefined,
    email: typeof s.email === "string" ? s.email : undefined,
    date: typeof s.date === "string" ? s.date : undefined,
    time: typeof s.time === "string" ? s.time : undefined,
    type: typeof s.type === "string" ? (s.type as MeetingType) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Appointment confirmed — Meridian" },
      { name: "description", content: "Your meeting is booked. Add it to your calendar or manage it anytime." },
      { property: "og:title", content: "Appointment confirmed — Meridian" },
      { property: "og:description", content: "Your meeting is booked. Add it to your calendar or manage it anytime." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Confirmation,
});

function Confirmation() {
  const s = Route.useSearch();
  const date = s.date ? parse(s.date, "yyyy-MM-dd", new Date()) : new Date();
  const rows: [string, string][] = [
    ["Date", format(date, "EEEE d MMMM yyyy")],
    ["Time", s.time ?? "10:00"],
    ["Duration", "30 minutes"],
    ["Meeting type", meetingLabel(s.type ?? "client")],
    ["Name", s.name ?? "Guest"],
    ["Email", s.email ?? "—"],
  ];
  const token = initialAppointments[2].token;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-16 md:py-24">
        <div className="text-center animate-in fade-in zoom-in-95 duration-500">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <h1 className="mt-6 text-3xl font-semibold">Your appointment is confirmed</h1>
          <p className="mt-2 text-muted-foreground">You’ll receive a reminder before the meeting.</p>
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
          <Button size="lg" className="rounded-full" onClick={() => toast.success("Calendar invite downloaded", { description: "meeting.ics saved to your device." })}>
            <CalendarPlus className="h-4 w-4" /> Add to calendar
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full bg-card">
            <Link to="/manage/$token" params={{ token }}><Settings2 className="h-4 w-4" /> Manage appointment</Link>
          </Button>
        </div>
        <div className="mt-6 text-center">
          <Button asChild variant="link" className="text-muted-foreground"><Link to="/">Back to home</Link></Button>
        </div>
      </main>
    </div>
  );
}
