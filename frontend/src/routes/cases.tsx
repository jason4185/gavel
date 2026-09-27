import { createFileRoute } from "@tanstack/react-router";
import { CasesScreen } from "@/components/gavel/screens";
export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "The Court Docket — GAVEL" },
      {
        name: "description",
        content:
          "Explore cases, procedural statuses, evidence deadlines, and judgments in the GAVEL court.",
      },
      { property: "og:title", content: "The Court Docket — GAVEL" },
      {
        property: "og:description",
        content:
          "Explore cases, procedural statuses, evidence deadlines, and judgments in the GAVEL court.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CasesScreen,
});
