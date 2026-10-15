import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MonthCalendar, TimeSlotPicker, combine } from "./scheduler";

export function RescheduleDialog({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: (d: Date) => void }) {
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>Choose a new date and time.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <MonthCalendar selected={date} onSelect={(d) => { setDate(d); setTime(null); }} />
          <div>
            {date ? (
              <>
                <p className="mb-3 text-sm font-medium">{format(date, "EEEE d MMMM")}</p>
                <TimeSlotPicker date={date} value={time} onChange={setTime} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a date first.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!date || !time} onClick={() => { if (date && time) { onConfirm(combine(date, time)); onOpenChange(false); setDate(null); setTime(null); } }}>
            Confirm new time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
