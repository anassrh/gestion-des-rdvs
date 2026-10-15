import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday,
  startOfMonth, startOfWeek, subDays, subMonths, subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatusDot } from "@/components/app/primitives";
import { AppointmentDrawer } from "@/components/app/appointment-drawer";
import { NewAppointmentDialog } from "@/components/app/new-appointment-dialog";
import { useAppointments } from "@/lib/appointments-store";
import { contactById, meetingShort, type Appointment } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Meridian Admin" },
      { name: "description", content: "Day, week and month views of your meetings." },
      { property: "og:title", content: "Calendar — Meridian Admin" },
      { property: "og:description", content: "Day, week and month views of your meetings." },
    ],
  }),
  component: CalendarPage,
});

type View = "day" | "week" | "month";
const START_H = 8;
const END_H = 19;
const HOUR_PX = 64;

function CalendarPage() {
  const { appointments } = useAppointments();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const move = (dir: 1 | -1) => {
    if (view === "day") setCursor((c) => (dir > 0 ? addDays(c, 1) : subDays(c, 1)));
    if (view === "week") setCursor((c) => (dir > 0 ? addWeeks(c, 1) : subWeeks(c, 1)));
    if (view === "month") setCursor((c) => (dir > 0 ? addMonths(c, 1) : subMonths(c, 1)));
  };

  const days = view === "day" ? [cursor] : eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) });
  const title = view === "month" ? format(cursor, "MMMM yyyy") : view === "day" ? format(cursor, "EEEE d MMMM yyyy") : `${format(days[0], "d MMM")} – ${format(days[6], "d MMM yyyy")}`;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-3xl font-semibold">{title}</h1>
        <Input type="date" aria-label="Go to date" className="h-9 w-auto bg-card" value={format(cursor, "yyyy-MM-dd")} onChange={(e) => e.target.value && setCursor(new Date(`${e.target.value}T12:00:00`))} />
        <div className="flex items-center rounded-lg border bg-card">
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Previous" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" className="h-9 px-3" onClick={() => setCursor(new Date())}>Today</Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Next" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as View)} className="rounded-lg border bg-card p-0.5">
          {(["day", "week", "month"] as View[]).map((v) => <ToggleGroupItem key={v} value={v} className="h-8 px-3 capitalize data-[state=on]:bg-secondary">{v}</ToggleGroupItem>)}
        </ToggleGroup>
        <Button className="rounded-full" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" />New appointment</Button>
      </div>

      {view === "month" ? (
        <MonthGrid cursor={cursor} appointments={appointments} onSelect={setSelected} onDay={(d) => { setCursor(d); setView("day"); }} />
      ) : (
        <TimeGrid days={days} appointments={appointments} onSelect={setSelected} />
      )}

      <AppointmentDrawer id={selected} onClose={() => setSelected(null)} />
      <NewAppointmentDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function EventCard({ a, onSelect, compact }: { a: Appointment; onSelect: (id: string) => void; compact?: boolean }) {
  const c = contactById(a.contactId);
  const highlight = a.status === "pending";
  return (
    <button
      onClick={() => onSelect(a.id)}
      className={cn(
        "h-full w-full overflow-hidden rounded-md border-l-2 px-2 py-1 text-left text-xs transition-shadow hover:shadow-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        highlight ? "border-primary bg-primary-soft" : "border-foreground/40 bg-secondary",
        a.status === "cancelled" && "line-through opacity-50",
      )}
    >
      <div className="flex items-center gap-1.5 font-medium text-foreground"><StatusDot status={a.status} /><span className="truncate">{c.name}</span></div>
      {!compact && <div className="truncate text-muted-foreground">{format(a.start, "HH:mm")} · {meetingShort(a.type)}</div>}
    </button>
  );
}

function TimeGrid({ days, appointments, onSelect }: { days: Date[]; appointments: Appointment[]; onSelect: (id: string) => void }) {
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const cols = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;
  return (
    <div className="surface-card overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid border-b" style={{ gridTemplateColumns: cols }}>
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="border-l px-3 py-3 text-center">
              <div className="text-xs text-muted-foreground">{format(d, "EEE")}</div>
              <div className={cn("mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium", isToday(d) && "bg-primary text-primary-foreground")}>{format(d, "d")}</div>
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div>
            {hours.map((h) => <div key={h} style={{ height: HOUR_PX }} className="pr-2 text-right text-[11px] text-muted-foreground tabular-nums -translate-y-2">{`${String(h).padStart(2, "0")}:00`}</div>)}
          </div>
          {days.map((d) => (
            <div key={d.toISOString()} className="relative border-l" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h) => <div key={h} className="border-b border-border/50" style={{ height: HOUR_PX }} />)}
              {appointments.filter((a) => isSameDay(a.start, d)).map((a) => {
                const top = (a.start.getHours() + a.start.getMinutes() / 60 - START_H) * HOUR_PX;
                const height = Math.max((a.duration / 60) * HOUR_PX - 2, 22);
                return (
                  <div key={a.id} className="absolute right-1 left-1" style={{ top, height }}>
                    <EventCard a={a} onSelect={onSelect} compact={height < 40} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({ cursor, appointments, onSelect, onDay }: { cursor: Date; appointments: Appointment[]; onSelect: (id: string) => void; onDay: (d: Date) => void }) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) });
  return (
    <div className="surface-card overflow-hidden">
      <div className="grid grid-cols-7 border-b">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="px-3 py-2 text-xs text-muted-foreground">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const items = appointments.filter((a) => isSameDay(a.start, d)).sort((a, b) => +a.start - +b.start);
          return (
            <div key={d.toISOString()} className={cn("min-h-28 border-r border-b p-1.5 last:border-r-0", !isSameMonth(d, cursor) && "bg-secondary/40")}>
              <button onClick={() => onDay(d)} className={cn("mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs hover:bg-secondary", isToday(d) && "bg-primary text-primary-foreground hover:bg-primary-hover", !isSameMonth(d, cursor) && "text-muted-foreground")}>{format(d, "d")}</button>
              <div className="space-y-1">
                {items.slice(0, 3).map((a) => <EventCard key={a.id} a={a} onSelect={onSelect} compact />)}
                {items.length > 3 && <button onClick={() => onDay(d)} className="px-1 text-[11px] text-muted-foreground hover:text-foreground">+{items.length - 3} more</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
