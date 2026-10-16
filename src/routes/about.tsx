import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/app/info-page";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — RdvFlow" },
      { name: "description", content: "Meet Benoît, CTO and technology advisor." },
      { property: "og:title", content: "About — RdvFlow" },
      { property: "og:description", content: "Meet Benoît, CTO and technology advisor." },
    ],
  }),
  component: () => (
    <InfoPage title="About">
      <p>
        Benoît is a CTO and technology advisor helping teams design resilient platforms, hire great
        engineers and adopt AI responsibly.
      </p>
      <p>Book a meeting to discuss architecture, partnerships or opportunities.</p>
    </InfoPage>
  ),
});
