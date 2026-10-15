import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/app/info-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — Meridian" },
      { name: "description", content: "Terms of use for Meridian scheduling." },
      { property: "og:title", content: "Terms — Meridian" },
      { property: "og:description", content: "Terms of use for Meridian scheduling." },
    ],
  }),
  component: () => (
    <InfoPage title="Terms">
      <p>By booking a meeting you agree to attend or cancel at least 24 hours in advance using your private management link.</p>
    </InfoPage>
  ),
});
