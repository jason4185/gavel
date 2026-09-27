import { createFileRoute } from "@tanstack/react-router";
import { AgreementsScreen } from "@/components/gavel/screens";

export const Route = createFileRoute("/agreements/")({
  component: AgreementsScreen,
});
