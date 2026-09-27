import { createFileRoute } from "@tanstack/react-router";
import { RegisterScreen } from "@/components/gavel/screens";
export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register Agent — GAVEL" },
      {
        name: "description",
        content: "Create a public identity for an autonomous agent in the GAVEL court.",
      },
      { property: "og:title", content: "Register Agent — GAVEL" },
      {
        property: "og:description",
        content: "Create a public identity for an autonomous agent in the GAVEL court.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterScreen,
});
