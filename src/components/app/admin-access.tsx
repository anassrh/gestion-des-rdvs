import { useState, type ReactNode } from "react";
import { useRemoteCore } from "@/lib/supabase/core-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function AdminAccess({ children }: { children: ReactNode }) {
  const core = useRemoteCore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!core) return <>{children}</>;
  if (!core.authReady)
    return (
      <p className="p-12 text-center" role="status">
        Loading secure workspace…
      </p>
    );
  if (!core.session)
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <span className="eyebrow">RdvFlow · Owner access</span>
        <h1 className="mt-3 text-3xl font-semibold">Welcome back</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to manage your appointments. Guest booking remains public.
        </p>
        <form
          className="surface-card mt-8 space-y-4 p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await core.signIn(email, password);
              setPassword("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to sign in.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block space-y-2 text-sm">
            <span>Email</span>
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span>Password</span>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <a className="mt-6 text-center text-sm text-muted-foreground underline" href="/booking">
          Book as a guest
        </a>
      </main>
    );
  if (core.loading)
    return (
      <p role="status" className="p-12 text-center">
        Loading appointments from Supabase…
      </p>
    );
  if (core.adminError)
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-semibold">Owner workspace unavailable</h1>
        <p role="alert" className="my-6 text-sm">
          {core.adminError}
        </p>
        <div className="flex gap-3">
          <Button onClick={() => void core.refresh()}>Retry</Button>
          <Button variant="outline" onClick={() => void core.signOut()}>
            Sign out
          </Button>
        </div>
      </main>
    );
  return <>{children}</>;
}
