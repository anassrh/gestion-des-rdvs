import { useState } from "react";
import { addMinutes, format } from "date-fns";
import { BellRing, Building2, CalendarClock, Check, Clock, Mail, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Initials, StatusBadge } from "./primitives";
import { RescheduleDialog } from "./reschedule-dialog";
import { ConfirmationDialog } from "./confirm-dialog";
import { contactById, meetingLabel } from "@/lib/mock-data";
import { useAppointments } from "@/lib/appointments-store";

const REMINDER: Record<string, string> = { sent: "Reminder sent", scheduled: "Reminder scheduled", failed: "Reminder failed", none: "No reminder" };
export const reminderLabel = (r: string) => REMINDER[r] ?? r;

export function AppointmentDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { appointments, setStatus, reschedule } = useAppointments();
  const a = appointments.find((x) => x.id === id);
  const [resched, setResched] = useState(false);
  const [cancel, setCancel] = useState(false);
  const c = a ? contactById(a.contactId) : null;
  const active = a && (a.status === "pending" || a.status === "confirmed");

  return (
    <>
      <Sheet open={!!a} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {a && c && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3">
                  <Initials name={c.name} size="lg" />
                  <div>
                    <SheetTitle className="text-xl">{c.name}</SheetTitle>
                    <SheetDescription>{c.role} · {c.company}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="mt-6 space-y-6 px-4 pb-6">
                <div className="rounded-xl bg-secondary p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{meetingLabel(a.type)}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{format(a.start, "EEE d MMM")}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{format(a.start, "HH:mm")}–{format(addMinutes(a.start, a.duration), "HH:mm")}</span>
                    <span className="flex items-center gap-1.5"><BellRing className="h-4 w-4" />{reminderLabel(a.reminder)}</span>
                  </div>
                </div>

                {active && (
                  <div className="flex flex-wrap gap-2">
                    {a.status === "pending" && (
                      <Button size="sm" onClick={() => { setStatus(a.id, "confirmed"); toast.success("Appointment confirmed"); }}>
                        <Check className="h-4 w-4" /> Confirm
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setResched(true)}><CalendarClock className="h-4 w-4" /> Reschedule</Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setCancel(true)}><X className="h-4 w-4" /> Cancel</Button>
                  </div>
                )}

                <section>
                  <h3 className="eyebrow mb-2">Contact</h3>
                  <div className="space-y-2 text-sm">
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="h-4 w-4 text-muted-foreground" />{c.email}</a>
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{c.phone}</div>
                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{c.company}</div>
                  </div>
                </section>

                <section>
                  <h3 className="eyebrow mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{a.notes || "No notes yet."}</p>
                </section>

                <section>
                  <h3 className="eyebrow mb-3">History</h3>
                  <ol className="relative space-y-4 border-l pl-4">
                    {[...a.history].reverse().map((h, i) => (
                      <li key={i} className="relative">
                        <span className="absolute top-1.5 -left-[21px] h-2 w-2 rounded-full border-2 border-background bg-silver" />
                        <div className="text-sm">{h.label}</div>
                        <div className="text-xs text-muted-foreground">{format(h.at, "d MMM yyyy, HH:mm")}</div>
                      </li>
                    ))}
                  </ol>
                </section>

                <p className="text-xs text-muted-foreground">Created {format(a.createdAt, "d MMM yyyy")}</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      {a && (
        <>
          <RescheduleDialog open={resched} onOpenChange={setResched} onConfirm={(d) => { reschedule(a.id, d); toast.success("Appointment rescheduled", { description: format(d, "EEE d MMM 'at' HH:mm") }); }} />
          <ConfirmationDialog
            open={cancel}
            onOpenChange={setCancel}
            destructive
            title="Cancel this appointment?"
            description={`${c?.name} will be notified by email.`}
            confirmLabel="Cancel appointment"
            onConfirm={() => { setStatus(a.id, "cancelled"); toast("Appointment cancelled"); }}
          />
        </>
      )}
    </>
  );
}
