import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/app/admin-shell";
import { AppointmentsProvider } from "@/lib/appointments-store";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AppointmentsProvider>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </AppointmentsProvider>
  );
}
