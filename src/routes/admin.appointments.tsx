import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, isSameDay, isAfter, isBefore, startOfDay, addDays, isSameWeek } from "date-fns";
import { CalendarClock, CalendarX2, Check, Eye, LayoutGrid, List, MoreHorizontal, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState, Initials, PageHeader, SearchInput, StatusBadge } from "@/components/app/primitives";
import { AppointmentDrawer, reminderLabel } from "@/components/app/appointment-drawer";
import { NewAppointmentDialog } from "@/components/app/new-appointment-dialog";
import { RescheduleDialog } from "@/components/app/reschedule-dialog";
import { ConfirmationDialog } from "@/components/app/confirm-dialog";
import { useAppointments } from "@/lib/appointments-store";
import { contactById, contacts, MEETING_TYPES, meetingShort } from "@/lib/mock-data";

type Search = { q?: string; status?: string };

export const Route = createFileRoute("/admin/appointments")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Appointments — Meridian Admin" },
      { name: "description", content: "Search, filter and manage every appointment." },
      { property: "og:title", content: "Appointments — Meridian Admin" },
      { property: "og:description", content: "Search, filter and manage every appointment." },
    ],
  }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const search = Route.useSearch();
  const { appointments, setStatus, reschedule } = useAppointments();
  const [q, setQ] = useState(search.q ?? "");
  const [status, setStatusF] = useState(search.status ?? "all");
  const [type, setType] = useState("all");
  const [when, setWhen] = useState("all");
  const [company, setCompany] = useState("all");
  const [view, setView] = useState("table");
  const [selected, setSelected] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const companies = [...new Set(contacts.map((c) => c.company))];

  const rows = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => {
        const c = contactById(a.contactId);
        if (q && !`${c.name} ${c.company} ${c.email}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (status !== "all" && a.status !== status) return false;
        if (type !== "all" && a.type !== type) return false;
        if (company !== "all" && c.company !== company) return false;
        if (when === "today" && !isSameDay(a.start, now)) return false;
        if (when === "tomorrow" && !isSameDay(a.start, addDays(now, 1))) return false;
        if (when === "week" && !isSameWeek(a.start, now, { weekStartsOn: 1 })) return false;
        if (when === "upcoming" && !isAfter(a.start, now)) return false;
        if (when === "past" && !isBefore(a.start, startOfDay(now))) return false;
        return true;
      })
      .sort((a, b) => +a.start - +b.start);
  }, [appointments, q, status, type, when, company]);

  const reset = () => { setQ(""); setStatusF("all"); setType("all"); setWhen("all"); setCompany("all"); };

  const Actions = ({ id, st }: { id: string; st: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => setSelected(id)}><Eye className="h-4 w-4" />View details</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSelected(id)}><Pencil className="h-4 w-4" />Edit</DropdownMenuItem>
        {st === "pending" && <DropdownMenuItem onClick={() => { setStatus(id, "confirmed"); toast.success("Appointment confirmed"); }}><Check className="h-4 w-4" />Confirm</DropdownMenuItem>}
        {(st === "pending" || st === "confirmed") && (
          <>
            <DropdownMenuItem onClick={() => setReschedId(id)}><CalendarClock className="h-4 w-4" />Reschedule</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setCancelId(id)}><X className="h-4 w-4" />Cancel</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="Appointments"
        description={`${rows.length} of ${appointments.length} appointments`}
        actions={<Button className="rounded-full" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" />New appointment</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, company, email" className="w-full sm:w-72" />
        <Filter value={when} onChange={setWhen} label="Date" options={[["all", "Any date"], ["today", "Today"], ["tomorrow", "Tomorrow"], ["week", "This week"], ["upcoming", "Upcoming"], ["past", "Past"]]} />
        <Filter value={status} onChange={setStatusF} label="Status" options={[["all", "All statuses"], ["pending", "Pending"], ["confirmed", "Confirmed"], ["completed", "Completed"], ["cancelled", "Cancelled"]]} />
        <Filter value={type} onChange={setType} label="Type" options={[["all", "All types"], ...MEETING_TYPES.map((m) => [m.value, m.label] as [string, string])]} />
        <Filter value={company} onChange={setCompany} label="Company" options={[["all", "All companies"], ...companies.map((c) => [c, c] as [string, string])]} />
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)} className="ml-auto rounded-lg border bg-card p-0.5">
          <ToggleGroupItem value="table" aria-label="Table view" className="h-8 w-8"><List className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="cards" aria-label="Card view" className="h-8 w-8"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarX2} title="No appointments match" description="Try adjusting your search or filters." action={<Button variant="outline" onClick={reset}>Clear filters</Button>} />
      ) : view === "table" ? (
        <div className="surface-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Reminder</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => {
                const c = contactById(a.contactId);
                return (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-secondary/60" onClick={() => setSelected(a.id)}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3"><Initials name={c.name} size="sm" /><span className="font-medium">{c.name}</span></div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{c.company}</TableCell>
                    <TableCell className="tabular-nums">{format(a.start, "EEE d MMM")}</TableCell>
                    <TableCell className="tabular-nums">{format(a.start, "HH:mm")}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{meetingShort(a.type)}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">{reminderLabel(a.reminder)}</TableCell>
                    <TableCell><Actions id={a.id} st={a.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((a) => {
            const c = contactById(a.contactId);
            return (
              <div key={a.id} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelected(a.id)} onClick={() => setSelected(a.id)} className="surface-card cursor-pointer p-5 transition-shadow hover:shadow-float focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3"><Initials name={c.name} /><div><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.company}</div></div></div>
                  <Actions id={a.id} st={a.status} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm tabular-nums">{format(a.start, "EEE d MMM · HH:mm")}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{meetingShort(a.type)} · {a.duration} min</div>
              </div>
            );
          })}
        </div>
      )}

      <AppointmentDrawer id={selected} onClose={() => setSelected(null)} />
      <NewAppointmentDialog open={newOpen} onOpenChange={setNewOpen} />
      <RescheduleDialog open={!!reschedId} onOpenChange={(o) => !o && setReschedId(null)} onConfirm={(d) => { if (reschedId) reschedule(reschedId, d); toast.success("Appointment rescheduled", { description: format(d, "EEE d MMM 'at' HH:mm") }); }} />
      <ConfirmationDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)} destructive title="Cancel this appointment?" description="The guest will be notified by email." confirmLabel="Cancel appointment" onConfirm={() => { if (cancelId) setStatus(cancelId, "cancelled"); toast("Appointment cancelled"); }} />
    </div>
  );
}

function Filter({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9 w-auto min-w-32 bg-card"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}
