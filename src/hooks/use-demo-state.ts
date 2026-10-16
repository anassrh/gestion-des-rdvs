import { useSyncExternalStore, type SetStateAction } from "react";
import { toast } from "sonner";

type Snapshot<T> = { value: T; ready: boolean };
type LocalStore<T> = {
  initial: Snapshot<T>;
  snapshot: Snapshot<T>;
  subscribe: (listener: () => void) => () => void;
  set: (action: SetStateAction<T>) => void;
};
const stores = new Map<string, LocalStore<unknown>>();
function compatible(template: unknown, value: unknown): boolean {
  if (Array.isArray(template))
    return (
      Array.isArray(value) &&
      (!template.length || value.every((item) => compatible(template[0], item)))
    );
  if (template && typeof template === "object")
    return (
      !!value &&
      typeof value === "object" &&
      Object.entries(template).every(([key, child]) =>
        compatible(child, (value as Record<string, unknown>)[key]),
      )
    );
  return typeof template === typeof value;
}

/** One live source per key, shared by every consumer and synchronized across tabs. */
export function useDemoState<T>(key: string, initial: T, decode?: (raw: unknown) => T) {
  if (!stores.has(key)) {
    const listeners = new Set<() => void>();
    const initialSnapshot = { value: initial, ready: false };
    const emit = () => listeners.forEach((listener) => listener());
    const read = () => {
      let value = initial;
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (!decode && !compatible(initial, parsed)) throw new Error("Invalid local data shape");
          value = decode ? decode(parsed) : (parsed as T);
        }
      } catch {
        toast.warning("Saved demo data could not be read", {
          description: "This section uses its default data. No server data was affected.",
        });
      }
      store.snapshot = { value, ready: true };
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        read();
        emit();
      }
    };
    const store: LocalStore<T> = {
      initial: initialSnapshot,
      snapshot: initialSnapshot,
      subscribe(listener) {
        if (!listeners.size) {
          read();
          window.addEventListener("storage", onStorage);
        }
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
          if (!listeners.size) window.removeEventListener("storage", onStorage);
        };
      },
      set(action) {
        if (!store.snapshot.ready) read();
        const value =
          typeof action === "function" ? (action as (old: T) => T)(store.snapshot.value) : action;
        store.snapshot = { value, ready: true };
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          toast.warning("Changes are available for this session only", {
            description: "Browser storage is unavailable or full.",
          });
        }
        emit();
      },
    };
    stores.set(key, store as LocalStore<unknown>);
  }
  const store = stores.get(key)! as LocalStore<T>;
  const snapshot = useSyncExternalStore(
    store.subscribe,
    () => store.snapshot,
    () => store.initial,
  );
  return [snapshot.value, store.set, snapshot.ready] as const;
}
