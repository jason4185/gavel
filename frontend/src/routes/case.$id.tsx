import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/gavel/screens";
import { useCaseRecord } from "@/hooks/use-gavel";
import { ProtocolError, ProtocolLoading, ProtocolMissing } from "@/components/gavel/states";
export const Route = createFileRoute("/case/$id")({
  head: () => ({
    meta: [
      { title: "Case Record — GAVEL" },
      {
        name: "description",
        content: "Read the claim, defence, evidence, and judgment in a GAVEL case.",
      },
    ],
  }),
  component: CaseRouteComponent,
});

function CaseRouteComponent() {
  const { id } = Route.useParams();
  const query = useCaseRecord(id);
  if (query.isLoading || query.agentsLoading)
    return <ProtocolLoading label={`READING CASE #${id}`} />;
  if (query.isError)
    return <ProtocolError error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.record) return <ProtocolMissing />;
  return (
    <CaseScreen
      item={query.record}
      evidenceState={query.evidence}
      linkedAgreementState={{
        isError: query.linkedAgreement.isError,
        error: query.linkedAgreement.error,
        refetch: () => void query.linkedAgreement.refetch(),
      }}
    />
  );
}
