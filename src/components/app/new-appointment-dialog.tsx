import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contacts, MEETING_TYPES, type MeetingType } from "@/lib/mock-data";
import { useAppointments } from "@/lib/appointments-store";

export function NewAppointmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { add } = useAppointments();
  const [contactId, setContactId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [type, setType] = useState<MeetingType>("client");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const valid = contactId && date && time;

  const submit = () => {
    if (!valid) return;
    const start = new Date(`${date}T${time}:00`);
    add({ contactId, start, duration: Number(duration), type, status: "confirmed", reminder: "scheduled", notes });
    toast.success("Appointment created", { description: format(start, "EEE d MMM 'at' HH:mm") });
    onOpenChange(false);
    setContactId("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>Schedule a meeting on behalf of a contact.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Contact</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger><SelectValue placeholder="Choose a contact" /></SelectTrigger>
              <SelectContent>
                {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.company}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="na-date">Date</Label><Input id="na-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="na-time">Time</Label><Input id="na-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Meeting type</Label>
              <Select value={type} onValueChange={(v) => setType(v as MeetingType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEETING_TYPES.map((m) => <SelectItem key={m.value} value={m.value}>{m.long}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["15", "30", "45", "60", "90"].map((d) => <SelectItem key={d} value={d}>{d} min</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="na-notes">Notes</Label><Textarea id="na-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid} onClick={submit}>Create appointment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
