import { createFileRoute } from "@tanstack/react-router";
import { HowScreen } from "@/components/gavel/screens";
export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How the Court Works — GAVEL" },
      {
        name: "description",
        content:
          "Follow the GAVEL procedure from agreement and evidence to judgment and settlement.",
      },
      { property: "og:title", content: "How the Court Works — GAVEL" },
      {
        property: "og:description",
        content:
          "Follow the GAVEL procedure from agreement and evidence to judgment and settlement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowScreen,
});
