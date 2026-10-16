import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/app/info-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — RdvFlow" },
      { name: "description", content: "How RdvFlow handles your personal data." },
      { property: "og:title", content: "Privacy — RdvFlow" },
      { property: "og:description", content: "How RdvFlow handles your personal data." },
    ],
  }),
  component: () => (
    <InfoPage title="Privacy">
      <p>
        We only collect the details needed to schedule your meeting and send reminders. Your data is
        never sold.
      </p>
    </InfoPage>
  ),
});
