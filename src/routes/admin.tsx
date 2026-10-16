import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/app/admin-shell";
import { AdminAccess } from "@/components/app/admin-access";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminAccess>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </AdminAccess>
  );
}
