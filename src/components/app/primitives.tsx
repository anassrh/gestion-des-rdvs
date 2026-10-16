import type { LucideIcon } from "lucide-react";
import { CheckCircle2, CircleDashed, CircleSlash, CircleCheckBig, Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { initials, type AppointmentStatus } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";

const STATUS: Record<AppointmentStatus, { label: string; icon: LucideIcon; cls: string }> = {
  pending: {
    label: "Pending",
    icon: CircleDashed,
    cls: "bg-status-pending-bg text-status-pending",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle2,
    cls: "bg-status-confirmed-bg text-status-confirmed",
  },
  cancelled: {
    label: "Cancelled",
    icon: CircleSlash,
    cls: "bg-status-cancelled-bg text-status-cancelled",
  },
  completed: {
    label: "Completed",
    icon: CircleCheckBig,
    cls: "bg-status-completed-bg text-status-completed",
  },
};

export const statusLabel = (s: AppointmentStatus) => STATUS[s].label;

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        s.cls,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{s.label}</span>
    </span>
  );
}

export function StatusDot({ status }: { status: AppointmentStatus }) {
  const map: Record<AppointmentStatus, string> = {
    pending: "bg-status-pending",
    confirmed: "bg-status-confirmed",
    cancelled: "bg-status-cancelled",
    completed: "bg-status-completed",
  };
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", map[status])}
      aria-label={STATUS[status].label}
    />
  );
}

export function Initials({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sz =
    size === "sm"
      ? "h-7 w-7 text-[11px]"
      : size === "lg"
        ? "h-12 w-12 text-base"
        : "h-9 w-9 text-xs";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground",
        sz,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-card", className)}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-base font-medium text-foreground">{title}</h2>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </span>
      <h3 className="mt-4 text-sm font-medium text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 bg-card pl-9"
      />
    </div>
  );
}
