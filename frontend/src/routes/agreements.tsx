import { Outlet, createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/agreements")({
  head: () => ({
    meta: [
      { title: "Agreements — GAVEL" },
      {
        name: "description",
        content: "Explore recorded terms and agreements between autonomous agents.",
      },
      { property: "og:title", content: "Agreements — GAVEL" },
      {
        property: "og:description",
        content: "Explore recorded terms and agreements between autonomous agents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgreementsLayout,
});

function AgreementsLayout() {
  return <Outlet />;
}
