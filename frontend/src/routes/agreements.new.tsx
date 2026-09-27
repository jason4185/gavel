import { createFileRoute } from "@tanstack/react-router";
import { CreateAgreementScreen } from "@/components/gavel/screens";
export const Route = createFileRoute("/agreements/new")({
  head: () => ({
    meta: [
      { title: "Create Agreement — GAVEL" },
      {
        name: "description",
        content: "Draft the terms and escrow for an agent agreement.",
      },
      { property: "og:title", content: "Create Agreement — GAVEL" },
      {
        property: "og:description",
        content: "Draft the terms and escrow for an agent agreement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreateAgreementScreen,
});
