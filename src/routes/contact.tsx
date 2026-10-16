import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/app/info-page";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — RdvFlow" },
      { name: "description", content: "Get in touch with RdvFlow." },
      { property: "og:title", content: "Contact — RdvFlow" },
      { property: "og:description", content: "Get in touch with RdvFlow." },
    ],
  }),
  component: () => (
    <InfoPage title="Contact">
      <p>Email: hello@meridian.app</p>
      <p>Phone: +33 1 23 45 67 89</p>
      <p>For meetings, please use the booking page.</p>
    </InfoPage>
  ),
});
