import { contractRead, toCalldataAddress } from "./client";
import {
  formatAddress,
  formatDeadline,
  formatGen,
  formatProtocolLabel,
  formatTimestamp,
} from "./format";
import type {
  Agent,
  Agreement,
  CourtCase,
  Evidence,
  GavelAgentPage,
  GavelAgentRaw,
  GavelAgreementPage,
  GavelAgreementRaw,
  GavelAgreementSummaryRaw,
  GavelCaseDetailRaw,
  GavelCasePage,
  GavelCaseRaw,
  GavelCaseSummaryRaw,
  GavelConfig,
  GavelEvidenceRaw,
  TimelineEvent,
} from "./types";

function asNumber(value: unknown): number {
  return typeof value === "bigint" ? Number(value) : Number(value);
}

function normalizeAgent(raw: GavelAgentRaw): GavelAgentRaw {
  return {
    ...raw,
    // The bounded agents-page summary contains only registered agents and
    // intentionally omits the per-address boolean returned by get_agent.
    registered: raw.registered ?? true,
    defendant_wins: asNumber(raw.defendant_wins),
    finalized_cases: asNumber(raw.finalized_cases),
    inconclusive_cases: asNumber(raw.inconclusive_cases),
    plaintiff_wins: asNumber(raw.plaintiff_wins),
    registered_at: asNumber(raw.registered_at),
  };
}

function normalizeAgreement<T extends GavelAgreementRaw | GavelAgreementSummaryRaw>(raw: T): T {
  return {
    ...raw,
    id: asNumber(raw.id),
    case_id: asNumber(raw.case_id),
    created_at: asNumber(raw.created_at),
    escrow: String(raw.escrow),
  } as T;
}

function normalizeCase(raw: GavelCaseRaw): GavelCaseRaw {
  return {
    ...raw,
    id: asNumber(raw.id),
    agreement_id: asNumber(raw.agreement_id),
    closed_at: asNumber(raw.closed_at),
    created_at: asNumber(raw.created_at),
    defendant_evidence_count: asNumber(raw.defendant_evidence_count),
    evidence_deadline: asNumber(raw.evidence_deadline),
    executed_at: asNumber(raw.executed_at),
    judged_at: asNumber(raw.judged_at),
    plaintiff_evidence_count: asNumber(raw.plaintiff_evidence_count),
    plaintiff_ready: Boolean(raw.plaintiff_ready),
    response_deadline: asNumber(raw.response_deadline),
    defendant_ready: Boolean(raw.defendant_ready),
  };
}

function normalizeEvidence(raw: GavelEvidenceRaw): GavelEvidenceRaw {
  return {
    ...raw,
    case_id: asNumber(raw.case_id),
    index: asNumber(raw.index),
    submitted_at: asNumber(raw.submitted_at),
  };
}

export function getConfig(): Promise<GavelConfig> {
  return contractRead<GavelConfig>("get_config");
}

export async function getAgent(address: string): Promise<GavelAgentRaw> {
  return normalizeAgent(
    await contractRead<GavelAgentRaw>("get_agent", [toCalldataAddress(address)]),
  );
}

export async function getMyAgent(address: string): Promise<GavelAgentRaw> {
  return normalizeAgent(await contractRead<GavelAgentRaw>("get_my_agent", [], address));
}

export async function getAgentsPage(cursor: number, limit: number): Promise<GavelAgentPage> {
  const page = await contractRead<GavelAgentPage>("get_agents_page", [
    BigInt(cursor),
    BigInt(limit),
  ]);
  return {
    items: page.items.map(normalizeAgent),
    next_cursor: asNumber(page.next_cursor),
    has_more: Boolean(page.has_more),
  };
}

export async function getAgreement(id: number): Promise<GavelAgreementRaw> {
  return normalizeAgreement(await contractRead<GavelAgreementRaw>("get_agreement", [BigInt(id)]));
}

export async function getAgreementsPage(
  cursor: number,
  limit: number,
): Promise<GavelAgreementPage> {
  const page = await contractRead<GavelAgreementPage>("get_agreements_page", [
    BigInt(cursor),
    BigInt(limit),
  ]);
  return {
    items: page.items.map(normalizeAgreement),
    next_cursor: asNumber(page.next_cursor),
    has_more: Boolean(page.has_more),
  };
}

export async function getCase(id: number): Promise<GavelCaseRaw> {
  return normalizeCase(await contractRead<GavelCaseRaw>("get_case", [BigInt(id)]));
}

export async function getCasesPage(cursor: number, limit: number): Promise<GavelCasePage> {
  const page = await contractRead<GavelCasePage>("get_cases_page", [BigInt(cursor), BigInt(limit)]);
  return {
    items: page.items.map((item) => ({
      ...item,
      id: asNumber(item.id),
      agreement_id: asNumber(item.agreement_id),
      created_at: asNumber(item.created_at),
      response_deadline: asNumber(item.response_deadline),
      evidence_deadline: asNumber(item.evidence_deadline),
      plaintiff_ready: Boolean(item.plaintiff_ready),
      defendant_ready: Boolean(item.defendant_ready),
    })),
    next_cursor: asNumber(page.next_cursor),
    has_more: Boolean(page.has_more),
  };
}

export async function getCaseDetail(id: number): Promise<GavelCaseDetailRaw> {
  const detail = await contractRead<GavelCaseDetailRaw>("get_case_detail", [BigInt(id)]);
  return {
    case: normalizeCase(detail.case),
    agreement: normalizeAgreement(detail.agreement),
    plaintiff_evidence: detail.plaintiff_evidence.map(normalizeEvidence),
    defendant_evidence: detail.defendant_evidence.map(normalizeEvidence),
  };
}

function agentKey(address: string): string {
  return address.toLowerCase();
}

export function agentLabel(address: string, agents: Map<string, GavelAgentRaw>): string {
  const agent = agents.get(agentKey(address));
  return agent?.display_name
    ? `${agent.display_name} · ${formatAddress(address)}`
    : formatAddress(address);
}

function agreementHistory(raw: GavelAgreementRaw): TimelineEvent[] {
  const history: TimelineEvent[] = [
    {
      label: "Agreement created",
      date: formatTimestamp(raw.created_at),
      detail: "Terms and escrow recorded in the court record.",
    },
  ];
  if (raw.accepted) {
    history.push({
      label: "Agreement accepted",
      date: "RECORDED",
      detail: "The provider acceptance is recorded.",
    });
  }
  if (raw.status === "DISPUTED" || raw.case_id) {
    history.push({
      label: "Dispute linked",
      date: "RECORDED",
      detail: `Case #${String(raw.case_id).padStart(3, "0")} is linked to this agreement.`,
    });
  }
  if (raw.status === "COMPLETED") {
    history.push({
      label: "Agreement completed",
      date: "RECORDED",
      detail: "The court record shows escrow released and completion recorded.",
    });
  }
  if (raw.status === "CANCELLED") {
    history.push({
      label: "Agreement cancelled",
      date: "RECORDED",
      detail: "The court record shows escrow released by cancellation.",
    });
  }
  return history;
}

function caseHistory(raw: GavelCaseRaw): TimelineEvent[] {
  const history: TimelineEvent[] = [
    {
      label: "Case filed",
      date: formatTimestamp(raw.created_at),
      detail: "Claim submitted to the court.",
    },
  ];
  if (raw.has_defence) {
    history.push({
      label: "Defence submitted",
      date: "RECORDED",
      detail: "The court record includes a defence.",
    });
  }
  if (raw.plaintiff_evidence_count || raw.defendant_evidence_count) {
    history.push({
      label: "Evidence recorded",
      date: "RECORDED",
      detail: `${raw.plaintiff_evidence_count} plaintiff and ${raw.defendant_evidence_count} defendant entries are stored.`,
    });
  }
  if (raw.judged_at) {
    history.push({
      label: "Judgment entered",
      date: formatTimestamp(raw.judged_at),
      detail: "A deterministic judgment was entered.",
    });
  }
  if (raw.executed_at) {
    history.push({
      label: "Judgment executed",
      date: formatTimestamp(raw.executed_at),
      detail: "The recorded settlement was executed.",
    });
  }
  return history;
}

export function toAgentRecord(raw: GavelAgentRaw): Agent {
  return {
    id: raw.address,
    name: raw.display_name || "Unregistered agent",
    address: raw.address,
    isRegistered: raw.registered,
    registered: formatTimestamp(raw.registered_at),
    finalized: raw.finalized_cases,
    plaintiffWins: raw.plaintiff_wins,
    defendantWins: raw.defendant_wins,
    inconclusive: raw.inconclusive_cases,
  };
}

export function toAgreementRecord(
  raw: GavelAgreementRaw | GavelAgreementSummaryRaw,
  agents: Map<string, GavelAgentRaw> = new Map(),
): Agreement {
  const clientAddress = raw.client ?? raw.creator;
  const providerAddress = raw.provider ?? raw.counterparty;
  return {
    id: String(raw.id).padStart(3, "0"),
    title: raw.title,
    client: agentLabel(clientAddress, agents),
    provider: agentLabel(providerAddress, agents),
    clientAddress,
    providerAddress,
    escrow: formatGen(raw.escrow),
    escrowWei: BigInt(raw.escrow),
    status: raw.status,
    accepted: raw.accepted,
    ...(raw.case_id ? { caseId: String(raw.case_id).padStart(3, "0") } : {}),
    date: formatTimestamp(raw.created_at),
    terms: raw.terms ?? "",
    released: raw.escrow_released ? "Released" : "Held",
    history: agreementHistory(raw as GavelAgreementRaw),
  };
}

export function toEvidenceRecord(raw: GavelEvidenceRaw): Evidence {
  return {
    id: `E-${String(raw.index + 1).padStart(2, "0")}`,
    type: formatProtocolLabel(raw.evidence_type),
    side: raw.side === "PLAINTIFF" ? "Plaintiff" : "Defendant",
    at: formatTimestamp(raw.submitted_at),
    body: raw.content,
    reference: raw.uri || "—",
  };
}

export function toCaseRecord(
  raw: GavelCaseRaw,
  evidence: GavelEvidenceRaw[],
  agents: Map<string, GavelAgentRaw> = new Map(),
  escrow = "",
): CourtCase {
  const plaintiff = agentLabel(raw.plaintiff, agents);
  const defendant = agentLabel(raw.defendant, agents);
  return {
    id: String(raw.id).padStart(3, "0"),
    title: `${plaintiff} v. ${defendant}`,
    plaintiff,
    defendant,
    plaintiffAddress: raw.plaintiff,
    plaintiffReady: raw.plaintiff_ready,
    defendantAddress: raw.defendant,
    defendantReady: raw.defendant_ready,
    claimType: formatProtocolLabel(raw.claim_type),
    claim: raw.claim,
    agreementId: String(raw.agreement_id).padStart(3, "0"),
    escrow,
    status: raw.status,
    filed: formatTimestamp(raw.created_at),
    responseDeadline: formatDeadline(raw.response_deadline),
    evidenceDeadline: formatDeadline(raw.evidence_deadline),
    responseDeadlineAt: raw.response_deadline,
    evidenceDeadlineAt: raw.evidence_deadline,
    claimBody: raw.claim,
    defence: raw.defence || "No defence has been submitted.",
    hasDefence: raw.has_defence,
    plaintiffEvidenceCount: raw.plaintiff_evidence_count,
    defendantEvidenceCount: raw.defendant_evidence_count,
    evidence: evidence.map(toEvidenceRecord),
    ...(raw.judgment_summary ? { judgment: raw.judgment_summary } : {}),
    ...(raw.reason_code ? { reason: formatProtocolLabel(raw.reason_code) } : {}),
    ...(raw.verdict ? { verdict: formatProtocolLabel(raw.verdict) } : {}),
    execution: formatProtocolLabel(raw.execution_status),
    history: caseHistory(raw),
  };
}

export function toCaseSummaryRecord(
  raw: GavelCaseSummaryRaw,
  agents: Map<string, GavelAgentRaw> = new Map(),
): CourtCase {
  const claimType = formatProtocolLabel(raw.claim_type);
  return toCaseRecord(
    {
      ...raw,
      agreement_status: "DISPUTED",
      claim: `${claimType} dispute`,
      closed_at: 0,
      defence: "",
      defendant_evidence_count: 0,
      executed_at: 0,
      has_defence: false,
      judged_at: 0,
      judgment_summary: "",
      plaintiff_evidence_count: 0,
      plaintiff_ready: raw.plaintiff_ready,
      reason_code: "",
      remedy_policy: "FULL_ESCROW",
      defendant_ready: raw.defendant_ready,
    },
    [],
    agents,
  );
}

export { formatAddress, formatDeadline, formatGen, formatTimestamp };
