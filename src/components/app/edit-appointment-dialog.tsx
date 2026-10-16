import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MEETING_TYPES, type Appointment } from "@/lib/mock-data";
import { useAppointments } from "@/lib/appointments-store";
import { attempt } from "@/lib/feedback";

export function EditAppointmentDialog({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const { update, busy } = useAppointments();
  const [duration, setDuration] = useState(appointment.duration);
  const [type, setType] = useState(appointment.type);
  const [notes, setNotes] = useState(appointment.notes);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit appointment</DialogTitle>
          <DialogDescription>
            Update the meeting details. Use Reschedule to change its time.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!(await attempt(() => update(appointment.id, { duration, type, notes })))) return;
            toast.success("Appointment updated");
            onClose();
          }}
        >
          <label className="block space-y-2 text-sm">
            <span>Meeting type</span>
            <select
              className="h-10 w-full rounded-md border bg-card px-3"
              value={type}
              onChange={(e) => setType(e.target.value as Appointment["type"])}
            >
              {MEETING_TYPES.map((m) => (
                <option value={m.value} key={m.value}>
                  {m.long}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm">
            <span>Duration (minutes)</span>
            <Input
              required
              type="number"
              min={15}
              max={120}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span>Notes</span>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
