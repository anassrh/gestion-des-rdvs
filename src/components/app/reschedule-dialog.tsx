import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAvailability } from "@/hooks/use-availability";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MonthCalendar, TimeSlotPicker, combine } from "./scheduler";

export function RescheduleDialog({
  open,
  onOpenChange,
  onConfirm,
  duration,
  excludeId,
  managementToken,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (d: Date) => void | Promise<void>;
  duration?: number | undefined;
  excludeId?: string | undefined;
  managementToken?: string | undefined;
}) {
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { slotsForDate, settings } = useAvailability(duration, excludeId, managementToken);
  useEffect(() => {
    setDate(null);
    setTime(null);
  }, [open, excludeId]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            Choose a new time for this {duration ?? settings.duration}-minute meeting. Attendance
            will return to pending.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <MonthCalendar
            managementToken={managementToken}
            duration={duration}
            excludeId={excludeId}
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setTime(null);
            }}
          />
          <div>
            {date ? (
              <>
                <p className="mb-3 text-sm font-medium">{format(date, "EEEE d MMMM")}</p>
                <TimeSlotPicker
                  managementToken={managementToken}
                  duration={duration}
                  excludeId={excludeId}
                  date={date}
                  value={time}
                  onChange={setTime}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a date first.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={saving || !date || !time || !slotsForDate(date).includes(time)}
            onClick={async () => {
              if (date && time) {
                if (saving) return;
                setSaving(true);
                try {
                  await onConfirm(combine(date, time));
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to reschedule.");
                  return;
                } finally {
                  setSaving(false);
                }
                onOpenChange(false);
                setDate(null);
                setTime(null);
              }
            }}
          >
            {saving ? "Saving…" : "Confirm new time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
