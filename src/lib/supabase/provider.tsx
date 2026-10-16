import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";
import { getRepository } from "./repository";
import { RemoteAppointmentsContext, RemoteCoreContext } from "./core-context";
import type { AppointmentStore } from "../appointments-contract";
import type { Appointment } from "../mock-data";
import type { Settings } from "./mapping";
import { defaultSettings } from "../preferences";
import { useRouterState } from "@tanstack/react-router";
import { useKnowledgeLifecycle } from "@/hooks/use-knowledge-lifecycle";

export function SupabaseProvider({ children }: { children: ReactNode }) {
  useKnowledgeLifecycle();
  const repository = useMemo(getRepository, []);
  const client = useMemo(getSupabaseClient, []);
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busyCount, setBusyCount] = useState(0);
  const [managed, setManaged] = useState<Record<string, Appointment>>({});
  const managedRef = useRef(managed);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  useEffect(() => {
    let mounted = true;
    void client.auth.getSession().then(({ data, error }) => {
      if (mounted) {
        setSession(data.session);
        setAuthReady(true);
        if (error) setAuthError(error.message);
      }
    });
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
      // Do not keep privileged owner records in a public browser cache after logout.
      if (!next) {
        queryClient.removeQueries({ queryKey: ["supabase", "admin"] });
        setManaged({});
        managedRef.current = {};
        if (_event === "SIGNED_OUT")
          queryClient.removeQueries({ queryKey: ["supabase", "managed"] });
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [client, queryClient]);
  const calendar = useQuery({
    queryKey: ["supabase", "calendar", "base"],
    queryFn: () => repository.calendar(),
    enabled: authReady,
    refetchInterval: 15000,
    retry: 1,
  });
  const admin = useQuery({
    queryKey: ["supabase", "admin", session?.user.id ?? null],
    queryFn: () => repository.list(),
    enabled: authReady && !!session,
    refetchInterval: 15000,
    retry: 0,
  });
  const rememberManaged = useCallback(
    (a: Appointment) => {
      if (!a.token) return;
      managedRef.current = { ...managedRef.current, [a.token]: a };
      setManaged(managedRef.current);
      queryClient.setQueryData(["supabase", "managed", a.token], a);
    },
    [queryClient],
  );
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["supabase"] });
  }, [queryClient]);
  const tokenFor = useCallback(
    (id: string) => Object.values(managedRef.current).find((a) => a.id === id)?.token,
    [],
  );
  const mutation = useCallback(
    async <T,>(work: () => Promise<T>) => {
      setBusyCount((n) => n + 1);
      try {
        const result = await work();
        void refresh().catch(() => {});
        return result;
      } catch (error) {
        await refresh();
        throw error;
      } finally {
        setBusyCount((n) => n - 1);
      }
    },
    [refresh],
  );
  const change = useCallback(
    async (id: string, action: string, input: Record<string, unknown> = {}) => {
      await mutation(async () => {
        const token = tokenFor(id);
        const adminAction = pathRef.current.startsWith("/admin");
        if (!adminAction && !token) throw new Error("A valid management link is required.");
        const updated = await repository.change(id, action, input, adminAction ? undefined : token);
        if (token) rememberManaged({ ...updated, token });
      });
    },
    [mutation, repository, rememberManaged, tokenFor],
  );
  const store: AppointmentStore = {
    appointments: session ? (admin.data?.appointments ?? []) : Object.values(managed),
    ready: authReady,
    busy: busyCount > 0,
    add: async (a, origin = "admin") =>
      mutation(async () => {
        const result = await repository.create(a, origin);
        rememberManaged(result.appointment);
        return result.token;
      }),
    setStatus: async (id, status) => {
      const actions = {
        confirmed: "confirm",
        cancelled: "cancel",
        completed: "complete",
        pending: "",
      };
      if (!actions[status]) throw new Error("Use Reschedule to return to pending.");
      await change(id, actions[status]);
    },
    reschedule: (id, start) => change(id, "reschedule", { starts_at: start.toISOString() }),
    update: (id, changes) =>
      change(id, "edit", {
        duration_minutes: changes.duration,
        meeting_type: changes.type,
        notes: changes.notes,
      }),
    managementToken: async (id) => {
      if (!sessionRef.current) {
        const token = tokenFor(id);
        if (!token) throw new Error("Management link unavailable.");
        return token;
      }
      return repository.issueToken(id);
    },
  };
  const fallback = { ...defaultSettings, name: "Owner", role: "", email: "" };
  const settings = admin.data?.settings ?? calendar.data?.settings ?? fallback;
  const core = {
    settings,
    contacts: admin.data?.contacts ?? [],
    session,
    authReady,
    loading: !authReady || (!!session && admin.isPending),
    error: authError ?? calendar.error?.message ?? null,
    adminError: admin.error?.message ?? null,
    busy: busyCount > 0,
    repository,
    rememberManaged,
    tokenFor,
    refresh,
    signIn: async (email: string, password: string) => {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
    saveSettings: async (value: Settings) => {
      await mutation(async () => {
        const snapshot = await repository.saveSettings(value);
        queryClient.setQueryData(["supabase", "admin", sessionRef.current?.user.id], snapshot);
      });
    },
  };
  return (
    <RemoteCoreContext.Provider value={core}>
      <RemoteAppointmentsContext.Provider value={store}>
        {core.error && (
          <div role="alert" className="border-b bg-destructive/10 p-4 text-sm">
            <strong>Supabase unavailable.</strong> {core.error}{" "}
            <button className="underline" onClick={() => void refresh()}>
              Retry
            </button>
            <p>No local appointment data is substituted.</p>
          </div>
        )}
        {children}
      </RemoteAppointmentsContext.Provider>
    </RemoteCoreContext.Provider>
  );
}
