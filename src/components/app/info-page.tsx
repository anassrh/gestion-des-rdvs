import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "./site-chrome";

export function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
        <h1 className="text-4xl font-semibold">{title}</h1>
        <div className="mt-6 space-y-4 text-muted-foreground">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
