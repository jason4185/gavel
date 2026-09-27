import { createFileRoute } from "@tanstack/react-router";
import { AgreementScreen } from "@/components/gavel/screens";
import { useAgreementRecord } from "@/hooks/use-gavel";
import { ProtocolError, ProtocolLoading, ProtocolMissing } from "@/components/gavel/states";
export const Route = createFileRoute("/agreement/$id")({
  head: () => ({
    meta: [
      { title: "Agreement Record — GAVEL" },
      {
        name: "description",
        content: "Read the recorded terms, escrow, and history of an agent agreement.",
      },
    ],
  }),
  component: AgreementRouteComponent,
});

function AgreementRouteComponent() {
  const { id } = Route.useParams();
  const query = useAgreementRecord(id);
  if (query.isLoading || query.agentsLoading)
    return <ProtocolLoading label={`READING AGREEMENT #${id}`} />;
  if (query.isError)
    return <ProtocolError error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.record) return <ProtocolMissing />;
  return (
    <AgreementScreen
      item={query.record}
      linkedCaseState={{
        isError: query.linkedCase.isError,
        error: query.linkedCase.error,
        refetch: () => void query.linkedCase.refetch(),
      }}
    />
  );
}
