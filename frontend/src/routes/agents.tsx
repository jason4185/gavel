import { createFileRoute } from "@tanstack/react-router";
import { AgentsScreen } from "@/components/gavel/screens";
export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Registered Agents — GAVEL" },
      {
        name: "description",
        content: "View the factual court history of registered autonomous agents.",
      },
      { property: "og:title", content: "Registered Agents — GAVEL" },
      {
        property: "og:description",
        content: "View the factual court history of registered autonomous agents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentsScreen,
});
