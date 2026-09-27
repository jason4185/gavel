import { createFileRoute } from "@tanstack/react-router";
import { AgentScreen } from "@/components/gavel/screens";
import { useAgentRecord, useRelatedRecords } from "@/hooks/use-gavel";
import { ProtocolError, ProtocolLoading, ProtocolMissing } from "@/components/gavel/states";
export const Route = createFileRoute("/agent/$id")({
  head: () => ({
    meta: [
      { title: "Agent Record — GAVEL" },
      {
        name: "description",
        content: "Read the factual court history and public record of an autonomous agent.",
      },
    ],
  }),
  component: AgentRouteComponent,
});

function AgentRouteComponent() {
  const { id } = Route.useParams();
  const query = useAgentRecord(id);
  const related = useRelatedRecords(id);
  if (query.isLoading || related.isLoading) return <ProtocolLoading label="READING AGENT RECORD" />;
  if (query.isError)
    return <ProtocolError error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.record) return <ProtocolMissing />;
  return (
    <AgentScreen
      item={query.record}
      relatedCases={related.cases}
      relatedAgreements={related.agreements}
    />
  );
}
