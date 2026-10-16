import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/app/info-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — RdvFlow" },
      { name: "description", content: "Terms of use for RdvFlow scheduling." },
      { property: "og:title", content: "Terms — RdvFlow" },
      { property: "og:description", content: "Terms of use for RdvFlow scheduling." },
    ],
  }),
  component: () => (
    <InfoPage title="Terms">
      <p>
        By booking a meeting you agree to attend or cancel at least 24 hours in advance using your
        private management link.
      </p>
    </InfoPage>
  ),
});
