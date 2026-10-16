import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, addMinutes } from "date-fns";
import {
  CalendarDays,
  Check,
  Clock,
  Mail,
  Phone,
  Building2,
  Timer,
  X,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/app/site-chrome";
import { Initials, StatusBadge } from "@/components/app/primitives";
import { RescheduleDialog } from "@/components/app/reschedule-dialog";
import { ConfirmationDialog } from "@/components/app/confirm-dialog";
import { contactById, meetingLabel } from "@/lib/mock-data";
import { useAppointments } from "@/lib/appointments-store";
import { attempt } from "@/lib/feedback";
import { Link } from "@tanstack/react-router";
import { useDemoState } from "@/hooks/use-demo-state";
import { defaultSettings } from "@/lib/preferences";
import { useManagedAppointment } from "@/hooks/use-managed-appointment";
import { usePreferences } from "@/hooks/use-preferences";
import { useRemoteCore } from "@/lib/supabase/core-context";

export const Route = createFileRoute("/manage/$token")({
  head: () => ({
    meta: [
      { title: "Manage your appointment — RdvFlow" },
      { name: "description", content: "Confirm, reschedule or cancel your meeting." },
      { property: "og:title", content: "Manage your appointment — RdvFlow" },
      { property: "og:description", content: "Confirm, reschedule or cancel your meeting." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Manage,
});

function Manage() {
  const { token } = Route.useParams();
  const settings = usePreferences();
  const remote = useRemoteCore();
  const {
    appointment: appt,
    loading,
    error,
    retry,
    confirm,
    cancel: cancelAppointment,
    reschedule,
  } = useManagedAppointment(token);
  const [resched, setResched] = useState(false);
  const [cancel, setCancel] = useState(false);
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
          <h1 className="text-2xl font-semibold">Unable to load this appointment</h1>
          <p role="alert" className="my-6 text-sm">
            {error}
          </p>
          <Button onClick={() => void retry()}>Retry</Button>
        </main>
      </div>
    );
  if (!appt)
    return (
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-3xl font-semibold">Appointment not found</h1>
          <p className="mt-4 text-muted-foreground">This link is invalid, expired or revoked.</p>
        </main>
      </div>
    );
  const c = appt.guest ?? contactById(appt.contactId);
  const closed = appt.status === "cancelled" || appt.status === "completed";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-14">
        <span className="eyebrow">Your appointment</span>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">
            {meetingLabel(appt.type)} with {settings.name}
          </h1>
          <StatusBadge status={appt.status} />
        </div>

        <div className="surface-card mt-8 grid gap-px overflow-hidden bg-border sm:grid-cols-3">
          {[
            [CalendarDays, "Date", format(appt.start, "EEE d MMM yyyy")],
            [
              Clock,
              "Time",
              `${format(appt.start, "HH:mm")} – ${format(addMinutes(appt.start, appt.duration), "HH:mm")}`,
            ],
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
          <div className="mt-4 grid gap-2 break-all text-sm text-muted-foreground sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {c.email}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {c.phone}
            </span>
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {c.company}
            </span>
          </div>
        </div>

        {closed ? (
          <p className="mt-8 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
            This appointment is {appt.status}. You can book a new meeting anytime.
          </p>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            {appt.status === "pending" && (
              <Button
                className="rounded-full"
                onClick={async () => {
                  if (!(await attempt(confirm))) return false;
                  toast.success("Appointment confirmed");
                  return true;
                }}
              >
                <Check className="h-4 w-4" /> Confirm appointment
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-full bg-card"
              onClick={() => setResched(true)}
            >
              <CalendarClock className="h-4 w-4" /> Reschedule
            </Button>
            <Button
              variant="ghost"
              className="rounded-full text-destructive hover:text-destructive"
              onClick={() => setCancel(true)}
            >
              <X className="h-4 w-4" /> Cancel appointment
            </Button>
          </div>
        )}
      </main>
      <div className="mx-auto max-w-2xl px-6 pb-8">
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              toast.success("Management link copied");
            } catch {
              toast("Copy this page’s URL from your address bar.");
            }
          }}
        >
          Copy management link
        </Button>{" "}
        <Button asChild variant="link">
          <Link to="/booking">Book another meeting</Link>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          {remote
            ? "Secure management link · Changes are saved in Supabase. No messages are sent."
            : "Local demo link · Works in this browser’s saved workspace. No messages are sent."}
        </p>
      </div>
      <RescheduleDialog
        managementToken={token}
        duration={appt.duration}
        excludeId={appt.id}
        open={resched}
        onOpenChange={setResched}
        onConfirm={async (d) => {
          await reschedule(d);
          toast.success("Appointment rescheduled", {
            description: format(d, "EEEE d MMMM 'at' HH:mm"),
          });
        }}
      />
      <ConfirmationDialog
        open={cancel}
        onOpenChange={setCancel}
        destructive
        title="Cancel this appointment?"
        description="Cancel this appointment? No email notification is sent. You can book another time later."
        confirmLabel="Cancel appointment"
        onConfirm={async () => {
          if (!(await attempt(cancelAppointment))) return false;
          toast("Appointment cancelled");
          return true;
        }}
      />
    </div>
  );
}
