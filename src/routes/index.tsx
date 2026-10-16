import { createFileRoute, Link } from "@tanstack/react-router";
import { addDays, format, startOfDay } from "date-fns";
import { ArrowRight, BellRing, CalendarCheck2, CalendarClock, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/app/site-chrome";
import { useAvailability } from "@/hooks/use-availability";
import { useRemoteCore } from "@/lib/supabase/core-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RdvFlow — Schedule a meeting effortlessly" },
      {
        name: "description",
        content:
          "Choose a time that works for you and manage your appointment in just a few clicks.",
      },
      { property: "og:title", content: "RdvFlow — Schedule a meeting effortlessly" },
      {
        property: "og:description",
        content:
          "Choose a time that works for you and manage your appointment in just a few clicks.",
      },
    ],
  }),
  component: Home,
});

const benefits = [
  {
    icon: CalendarCheck2,
    title: "Easy scheduling",
    text: "See available times and request a meeting in under a minute.",
  },
  {
    icon: BellRing,
    title: "Automatic reminders",
    text: "Preview reminder preferences before notifications are connected.",
  },
  {
    icon: Repeat2,
    title: "Flexible rescheduling",
    text: "Change or cancel anytime from a private link.",
  },
];

function AvailabilityPreview() {
  const { slotsForDate, settings, loading, error } = useAvailability();
  const today = startOfDay(new Date());
  const days = Array.from({ length: settings.horizon + 1 }, (_, i) => addDays(today, i))
    .filter((d) => slotsForDate(d).length)
    .slice(0, 3);
  return (
    <div className="surface-card w-full max-w-sm p-6 shadow-float">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Next availability</span>
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-5 space-y-5">
        {!days.length && (
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading availability…"
              : error
                ? "Availability could not be loaded. Please try again."
                : "No appointments are available within the current booking horizon. Please check again later."}
          </p>
        )}
        {days.map((d) => (
          <div key={d.toISOString()}>
            <div className="text-sm font-medium">{format(d, "EEEE, d MMMM")}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {slotsForDate(d)
                .slice(0, 4)
                .map((s, i) => (
                  <Link
                    key={s}
                    to="/booking"
                    search={{ date: format(d, "yyyy-MM-dd"), time: s }}
                    className={
                      "rounded-md border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors " +
                      (i === 0 && d === days[0]
                        ? "border-primary bg-primary-soft text-primary"
                        : "bg-card hover:border-primary hover:text-primary")
                    }
                  >
                    {s}
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Home() {
  const remote = !!useRemoteCore();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 pt-20 pb-24 md:grid-cols-[1.2fr_1fr] md:pt-28">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />{" "}
              {remote ? "Online scheduling" : "Local scheduling demo"}
            </span>
            <h1 className="mt-6 text-5xl leading-[1.05] font-semibold text-foreground md:text-6xl">
              Schedule a meeting
              <br />
              effortlessly.
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Choose a time that works for you and manage your appointment in just a few clicks.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-[15px]">
                <Link to="/booking">
                  Book an appointment <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-12 rounded-full px-5 text-[15px]"
              >
                <Link to="/booking">View availability</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <AvailabilityPreview />
          </div>
        </section>

        <section className="border-t border-border/60 bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title}>
                <b.icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-4 text-base font-medium">{b.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24">
          <span className="eyebrow">How it works</span>
          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
            {["Choose a time", "Enter your details", "Receive confirmation"].map((t, i) => (
              <div key={t} className="bg-card p-8">
                <span className="text-sm font-medium text-primary tabular-nums">0{i + 1}</span>
                <h3 className="mt-3 text-xl font-medium">{t}</h3>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
