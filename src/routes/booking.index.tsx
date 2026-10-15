import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Clock, Globe, Loader2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/app/site-chrome";
import { MonthCalendar, TimeSlotPicker } from "@/components/app/scheduler";
import { MEETING_TYPES, type MeetingType } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking/")({
  head: () => ({
    meta: [
      { title: "Book a meeting — Meridian" },
      { name: "description", content: "Pick a date and time and book a 30-minute meeting in seconds." },
      { property: "og:title", content: "Book a meeting — Meridian" },
      { property: "og:description", content: "Pick a date and time and book a 30-minute meeting in seconds." },
    ],
  }),
  component: BookingPage,
});

type Form = { firstName: string; lastName: string; email: string; phone: string; company: string; type: MeetingType | ""; note: string };
const empty: Form = { firstName: "", lastName: "", email: "", phone: "", company: "", type: "", note: "" };

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (!f.firstName.trim()) e.firstName = "First name is required";
  if (!f.lastName.trim()) e.lastName = "Last name is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address";
  if (!/^[+\d][\d\s().-]{6,}$/.test(f.phone)) e.phone = "Enter a valid phone number";
  if (!f.type) e.type = "Choose a meeting type";
  return e;
}

function BookingPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const errors = useMemo(() => validate(form), [form]);
  const valid = Object.keys(errors).length === 0 && date && time;
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Europe/Paris";

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: keyof Form) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof Form) => (touched[k] ? errors[k] : undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !date || !time) return;
    setSubmitting(true);
    setTimeout(() => {
      navigate({
        to: "/booking/confirmation",
        search: {
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          date: format(date, "yyyy-MM-dd"),
          time,
          type: form.type as MeetingType,
        },
      });
    }, 700);
  };

  const field = (k: keyof Form, label: string, props: React.ComponentProps<typeof Input> = {}, optional = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={k} className="text-sm font-normal text-muted-foreground">
        {label} {optional && <span className="text-muted-foreground/70">(optional)</span>}
      </Label>
      <Input
        id={k}
        value={form[k]}
        onChange={(e) => set(k)(e.target.value)}
        onBlur={blur(k)}
        aria-invalid={!!err(k)}
        aria-describedby={err(k) ? `${k}-err` : undefined}
        className={cn("h-11 bg-card", err(k) && "border-destructive")}
        {...props}
      />
      {err(k) && <p id={`${k}-err`} className="text-xs text-destructive">{err(k)}</p>}
    </div>
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="mb-10">
          <span className="eyebrow">Book a meeting</span>
          <h1 className="mt-2 text-4xl font-semibold">Pick a time with Benoît</h1>
          <p className="mt-2 text-muted-foreground">30-minute video call · Confirmation sent instantly</p>
        </div>

        <div className="surface-card grid overflow-hidden md:grid-cols-[1fr_1.1fr]">
          <div className="border-b p-6 md:border-r md:border-b-0 md:p-8">
            <MonthCalendar selected={date} onSelect={(d) => { setDate(d); setTime(null); }} />
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" /> {tz}
            </div>
          </div>

          <div className="p-6 md:p-8">
            {!date ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Select a date to see available times.</p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                <h2 className="text-lg font-semibold">{format(date, "EEEE d MMMM")}</h2>
                <p className="mb-4 text-sm text-muted-foreground">Available times</p>
                <TimeSlotPicker date={date} value={time} onChange={setTime} />

                {time && (
                  <form onSubmit={submit} className="mt-8 animate-in fade-in slide-in-from-bottom-1 space-y-4 border-t pt-8 duration-300" noValidate>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg bg-secondary px-4 py-3 text-sm">
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-muted-foreground" />{format(date, "EEE d MMM")}</span>
                      <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground" />{time}</span>
                      <span className="flex items-center gap-1.5"><Timer className="h-4 w-4 text-muted-foreground" />30 min</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {field("firstName", "First name", { autoComplete: "given-name" })}
                      {field("lastName", "Last name", { autoComplete: "family-name" })}
                      {field("email", "Email", { type: "email", autoComplete: "email" })}
                      {field("phone", "Phone", { type: "tel", autoComplete: "tel" })}
                    </div>
                    {field("company", "Company", { autoComplete: "organization" }, true)}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-normal text-muted-foreground">Meeting type</Label>
                      <Select value={form.type} onValueChange={(v) => { set("type")(v); setTouched((t) => ({ ...t, type: true })); }}>
                        <SelectTrigger className={cn("h-11 bg-card", err("type") && "border-destructive")} aria-invalid={!!err("type")}>
                          <SelectValue placeholder="Select a meeting type" />
                        </SelectTrigger>
                        <SelectContent>
                          {MEETING_TYPES.map((m) => <SelectItem key={m.value} value={m.value}>{m.long}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {err("type") && <p className="text-xs text-destructive">{err("type")}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="note" className="text-sm font-normal text-muted-foreground">Note <span className="text-muted-foreground/70">(optional)</span></Label>
                      <Textarea id="note" value={form.note} onChange={(e) => set("note")(e.target.value)} rows={3} className="bg-card" placeholder="Anything I should know before we meet?" />
                    </div>
                    <Button type="submit" size="lg" disabled={!valid || submitting} className="h-12 w-full rounded-full text-[15px]">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Confirm appointment
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
