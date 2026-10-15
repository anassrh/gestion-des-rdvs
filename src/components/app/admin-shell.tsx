import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Initials, SearchInput } from "./primitives";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { recentActivity } from "@/lib/mock-data";

const nav = [
  { title: "Dashboard", url: "/admin", icon: LayoutGrid },
  { title: "Appointments", url: "/admin/appointments", icon: CalendarRange },
  { title: "Calendar", url: "/admin/calendar", icon: CalendarDays },
  { title: "Contacts", url: "/admin/contacts", icon: Users },
  { title: "Automations", url: "/admin/automations", icon: Workflow },
  { title: "Knowledge", url: "/admin/knowledge", icon: BookOpen },
  { title: "AI Assistant", url: "/admin/chat", icon: Sparkles },
  { title: "Settings", url: "/admin/settings", icon: Settings },
] as const;

function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const isActive = (u: string) => (u === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(u));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center px-3">
        <Link to="/admin" className="flex items-center gap-2 px-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background">M</span>
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight">Meridian</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {nav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-9 text-[13.5px] data-[active=true]:bg-card data-[active=true]:font-medium data-[active=true]:shadow-soft"
                  >
                    <Link to={item.url}>
                      <item.icon className={isActive(item.url) ? "text-primary" : "text-muted-foreground"} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5 rounded-lg p-1.5">
          <Initials name="Benoît Admin" size="sm" className="bg-foreground text-background" />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">Benoît</div>
                <div className="text-xs text-muted-foreground">CTO</div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Log out"
                onClick={() => { toast("Signed out (demo)"); navigate({ to: "/" }); }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function Topbar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger />
      <form
        className="max-w-sm flex-1"
        onSubmit={(e) => { e.preventDefault(); navigate({ to: "/admin/appointments", search: { q } }); }}
      >
        <SearchInput value={q} onChange={setQ} placeholder="Search appointments, contacts…" />
      </form>
      <div className="ml-auto flex items-center gap-1.5">
        <Button size="sm" className="hidden rounded-full sm:inline-flex" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New appointment
        </Button>
        <Button size="icon" className="rounded-full sm:hidden" aria-label="New appointment" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentActivity.slice(0, 4).map((a) => (
              <DropdownMenuItem key={a.id} className="flex flex-col items-start gap-0.5">
                <span className="text-sm">{a.text}</span>
                <span className="text-xs text-muted-foreground">{a.ago}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Profile menu">
              <Initials name="Benoît Admin" size="sm" className="bg-foreground text-background" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Benoît · CTO</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/admin/settings">Settings</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/">View public page</Link></DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast("Signed out (demo)")}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <NewAppointmentDialog open={open} onOpenChange={setOpen} />
    </header>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8 md:py-10">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
