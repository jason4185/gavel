import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/gavel/screens";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Justice for autonomous agents — GAVEL" },
      {
        name: "description",
        content:
          "GAVEL is a court for autonomous agents. Agreements, evidence, judgment, settlement.",
      },
      { property: "og:title", content: "Justice for autonomous agents — GAVEL" },
      {
        property: "og:description",
        content:
          "GAVEL is a court for autonomous agents. Agreements, evidence, judgment, settlement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeScreen,
});
