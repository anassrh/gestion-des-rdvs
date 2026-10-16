import { useContacts } from "@/hooks/use-contacts";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { Users } from "lucide-react";
import {
  PageHeader,
  SearchInput,
  Initials,
  StatusBadge,
  EmptyState,
} from "@/components/app/primitives";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { contacts, meetingLabel } from "@/lib/mock-data";
import { useAppointments } from "@/lib/appointments-store";
import { AppointmentDrawer } from "@/components/app/appointment-drawer";
import { allContacts, contactMeetings } from "@/lib/contact-selectors";

export const Route = createFileRoute("/admin/contacts")({
  component: ContactsPage,
  head: () => ({ meta: [{ title: "Contacts — RdvFlow" }] }),
});

function ContactsPage() {
  const { appointments } = useAppointments();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const all = useContacts();
  const rows = all.filter((c) =>
    `${c.name} ${c.company} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()),
  );
  const person = all.find((c) => c.id === selected);
  const meetings = (id: string) =>
    contactMeetings(
      all.find((c) => c.id === id)!,
      appointments,
    );
  const dateLabel = (d?: Date) => (d ? format(d, "d MMM yyyy · HH:mm") : "—");
  return (
    <>
      <PageHeader title="Contacts" description="The people behind your conversations." />
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search contacts, companies, email…"
        className="mb-6 max-w-md"
      />
      {!rows.length ? (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description="Try another name or company."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => {
            const history = meetings(c.id);
            const past = history.filter((a) => a.start < new Date()).at(-1);
            const next = history.find(
              (a) => a.start > new Date() && (a.status === "pending" || a.status === "confirmed"),
            );
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className="surface-card p-5 text-left transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <div className="flex items-center gap-3">
                  <Initials name={c.name} />
                  <div>
                    <h2 className="font-medium">{c.name}</h2>
                    <p className="text-sm text-muted-foreground">{c.company}</p>
                  </div>
                </div>
                <p className="mt-4 break-all text-sm">{c.email}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.phone}</p>
                <dl className="mt-5 space-y-2 border-t pt-4 text-xs">
                  <div className="flex justify-between">
                    <dt>Meetings</dt>
                    <dd>{history.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Last appointment</dt>
                    <dd>{dateLabel(past?.start)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Next appointment</dt>
                    <dd>{dateLabel(next?.start)}</dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </div>
      )}
      <Sheet open={!!person} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{person?.name}</SheetTitle>
            <SheetDescription>
              {person?.company} · {person?.role}
            </SheetDescription>
          </SheetHeader>
          {person && (
            <div className="space-y-6 p-4">
              <div className="space-y-2 text-sm">
                <p className="break-all">{person.email}</p>
                <p>{person.phone}</p>
                <p className="text-muted-foreground">{person.notes || "No contact notes."}</p>
              </div>
              <h3 className="font-medium">Meeting history</h3>
              {meetings(person.id).map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelected(null);
                    setAppointmentId(a.id);
                  }}
                  className="w-full rounded-lg border p-3 text-left hover:bg-secondary"
                >
                  <div className="flex justify-between gap-2 text-sm">
                    <span>{meetingLabel(a.type)}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {dateLabel(a.start)} · {a.duration} min
                  </p>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <AppointmentDrawer id={appointmentId} onClose={() => setAppointmentId(null)} />
    </>
  );
}
