import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, addMinutes } from "date-fns";
import { CalendarDays, Check, Clock, Mail, Phone, Building2, Timer, X, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/app/site-chrome";
import { Initials, StatusBadge } from "@/components/app/primitives";
import { RescheduleDialog } from "@/components/app/reschedule-dialog";
import { ConfirmationDialog } from "@/components/app/confirm-dialog";
import { contactById, initialAppointments, meetingLabel, type Appointment } from "@/lib/mock-data";

export const Route = createFileRoute("/manage/$token")({
  head: () => ({
    meta: [
      { title: "Manage your appointment — Meridian" },
      { name: "description", content: "Confirm, reschedule or cancel your meeting." },
      { property: "og:title", content: "Manage your appointment — Meridian" },
      { property: "og:description", content: "Confirm, reschedule or cancel your meeting." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Manage,
});

function Manage() {
  const { token } = Route.useParams();
  const found = initialAppointments.find((a) => a.token === token) ?? initialAppointments[2];
  const [appt, setAppt] = useState<Appointment>(found);
  const [resched, setResched] = useState(false);
  const [cancel, setCancel] = useState(false);
  const c = contactById(appt.contactId);
  const closed = appt.status === "cancelled" || appt.status === "completed";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-14">
        <span className="eyebrow">Your appointment</span>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{meetingLabel(appt.type)} with Benoît</h1>
          <StatusBadge status={appt.status} />
        </div>

        <div className="surface-card mt-8 grid gap-px overflow-hidden bg-border sm:grid-cols-3">
          {[
            [CalendarDays, "Date", format(appt.start, "EEE d MMM yyyy")],
            [Clock, "Time", `${format(appt.start, "HH:mm")} – ${format(addMinutes(appt.start, appt.duration), "HH:mm")}`],
            [Timer, "Duration", `${appt.duration} minutes`],
          ].map(([Icon, k, v]) => {
            const I = Icon as typeof Clock;
            return (
              <div key={k as string} className="bg-card p-5">
                <I className="h-4 w-4 text-muted-foreground" />
                <div className="mt-3 text-xs text-muted-foreground">{k as string}</div>
                <div className="mt-0.5 font-medium">{v as string}</div>
              </div>
            );
          })}
        </div>

        <div className="surface-card mt-4 p-5">
          <div className="flex items-center gap-3">
            <Initials name={c.name} />
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-muted-foreground">{c.role}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <span className="flex items-center gap-2"><Mail className="h-4 w-4" />{c.email}</span>
            <span className="flex items-center gap-2"><Phone className="h-4 w-4" />{c.phone}</span>
            <span className="flex items-center gap-2"><Building2 className="h-4 w-4" />{c.company}</span>
          </div>
        </div>

        {closed ? (
          <p className="mt-8 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
            This appointment is {appt.status}. You can book a new meeting anytime.
          </p>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            {appt.status === "pending" && (
              <Button className="rounded-full" onClick={() => { setAppt({ ...appt, status: "confirmed" }); toast.success("Appointment confirmed"); }}>
                <Check className="h-4 w-4" /> Confirm appointment
              </Button>
            )}
            <Button variant="outline" className="rounded-full bg-card" onClick={() => setResched(true)}>
              <CalendarClock className="h-4 w-4" /> Reschedule
            </Button>
            <Button variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={() => setCancel(true)}>
              <X className="h-4 w-4" /> Cancel appointment
            </Button>
          </div>
        )}
      </main>
      <RescheduleDialog
        open={resched}
        onOpenChange={setResched}
        onConfirm={(d) => { setAppt({ ...appt, start: d, status: "pending" }); toast.success("Appointment rescheduled", { description: format(d, "EEEE d MMMM 'at' HH:mm") }); }}
      />
      <ConfirmationDialog
        open={cancel}
        onOpenChange={setCancel}
        destructive
        title="Cancel this appointment?"
        description="Benoît will be notified. You can always book a new time later."
        confirmLabel="Cancel appointment"
        onConfirm={() => { setAppt({ ...appt, status: "cancelled" }); toast("Appointment cancelled"); }}
      />
    </div>
  );
}
