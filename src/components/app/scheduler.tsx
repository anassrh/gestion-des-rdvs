import { useEffect, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAvailability } from "@/hooks/use-availability";

export function MonthCalendar({
  selected,
  onSelect,
  duration,
  excludeId,
  managementToken,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
  duration?: number | undefined;
  excludeId?: string | undefined;
  managementToken?: string | undefined;
}) {
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()));
  useEffect(() => {
    if (selected) setMonth(startOfMonth(selected));
  }, [selected]);
  const { slotsForDate, settings, loading, error } = useAvailability(
    duration,
    excludeId,
    managementToken,
  );
  const today = startOfDay(new Date());
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const canPrev = !isSameMonth(month, today) && !isBefore(month, today);
  if (loading)
    return (
      <p role="status" className="py-8 text-sm text-muted-foreground">
        Loading availability…
      </p>
    );
  if (error)
    return (
      <p role="alert" className="py-8 text-sm text-destructive">
        {error}
      </p>
    );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{format(month, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMonth(subMonths(month, 1))}
            disabled={!canPrev}
            aria-label="Previous month"
            className="rounded-full p-2 text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, 1))}
            disabled={startOfMonth(addMonths(month, 1)) > addDays(today, settings.horizon)}
            aria-label="Next month"
            className="rounded-full p-2 text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="pb-2 text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const inMonth = isSameMonth(d, month);
          const available = inMonth && !isBefore(d, today) && slotsForDate(d).length > 0;
          const sel = selected && isSameDay(d, selected);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={!available}
              onClick={() => onSelect(d)}
              aria-pressed={!!sel}
              aria-label={format(d, "EEEE d MMMM")}
              className={cn(
                "relative mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                !inMonth && "invisible",
                available && !sel && "font-medium text-foreground hover:bg-primary-soft",
                !available && "text-muted-foreground/40",
                sel && "bg-primary font-semibold text-primary-foreground shadow-soft",
              )}
            >
              {format(d, "d")}
              {isToday(d) && !sel && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      {!days.some((d) => isSameMonth(d, month) && slotsForDate(d).length > 0) && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          No available times this month within the booking rules. Try another month.
        </p>
      )}
    </div>
  );
}

export function TimeSlotPicker({
  date,
  value,
  onChange,
  duration,
  excludeId,
  managementToken,
}: {
  date: Date;
  value: string | null;
  onChange: (t: string) => void;
  duration?: number | undefined;
  excludeId?: string | undefined;
  managementToken?: string | undefined;
}) {
  const { slotsForDate, loading, error } = useAvailability(duration, excludeId, managementToken);
  if (loading)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading available times…
      </p>
    );
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  const slots = slotsForDate(date);
  if (!slots.length)
    return <p className="text-sm text-muted-foreground">No availability on this day.</p>;
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      role="radiogroup"
      aria-label="Available times"
    >
      {slots.map((s) => {
        const sel = s === value;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={sel}
            onClick={() => onChange(s)}
            className={cn(
              "h-11 rounded-lg border text-sm font-medium tabular-nums transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              sel
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

export function combine(date: Date, time: string) {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}
