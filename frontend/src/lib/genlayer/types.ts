export type GavelAgreementStatus =
  "PENDING_ACCEPTANCE" | "ACTIVE" | "DISPUTED" | "COMPLETED" | "CANCELLED" | "EXPIRED";

export type GavelCaseStatus = "DEFENCE_OPEN" | "EVIDENCE_OPEN" | "JUDGED" | "EXECUTED";

export type GavelEvidenceType = "DOCUMENT" | "MESSAGE" | "RECEIPT" | "LOG" | "OTHER";

export type GavelEvidenceSide = "PLAINTIFF" | "DEFENDANT";

export type GavelConfig = {
  agreement_states: GavelAgreementStatus[];
  case_states: GavelCaseStatus[];
  chain_id: number;
  claim_types: string[];
  escrow_asset: string;
  evidence_types: GavelEvidenceType[];
  evidence_window_seconds: number;
  max_evidence_description: number;
  max_evidence_per_side: number;
  max_evidence_url: number;
  max_fetched_evidence_bytes: number;
  max_total_verified_evidence_bytes: number;
  max_page_size: number;
  name: string;
  remedy_policy: string;
  response_window_seconds: number;
  acceptance_window_seconds: number;
  verdicts: string[];
  version: string;
};

export type GavelAgentRaw = {
  address: string;
  defendant_wins: number;
  display_name: string;
  finalized_cases: number;
  inconclusive_cases: number;
  plaintiff_wins: number;
  registered: boolean;
  registered_at: number;
};

export type GavelAgreementRaw = {
  accepted: boolean;
  case_id: number;
  counterparty: string;
  created_at: number;
  creator: string;
  escrow: string;
  escrow_released: boolean;
  accept_deadline: number;
  id: number;
  remedy_policy: string;
  status: GavelAgreementStatus;
  terms: string;
  title: string;
  client?: string;
  provider?: string;
};

export type GavelAgreementSummaryRaw = Omit<GavelAgreementRaw, "terms" | "remedy_policy"> & {
  terms?: string;
  remedy_policy?: string;
};

export type GavelCaseRaw = {
  agreement_id: number;
  agreement_status: GavelAgreementStatus;
  claim: string;
  claim_type: string;
  closed_at: number;
  created_at: number;
  defence: string;
  defendant: string;
  defendant_evidence_count: number;
  evidence_deadline: number;
  executed_at: number;
  execution_status: string;
  has_defence: boolean;
  id: number;
  judged_at: number;
  judgment_summary: string;
  plaintiff: string;
  plaintiff_ready: boolean;
  plaintiff_evidence_count: number;
  reason_code: string;
  remedy_policy: string;
  response_deadline: number;
  status: GavelCaseStatus;
  defendant_ready: boolean;
  verdict: string;
};

export type GavelCaseSummaryRaw = Pick<
  GavelCaseRaw,
  | "id"
  | "agreement_id"
  | "plaintiff"
  | "plaintiff_ready"
  | "defendant"
  | "defendant_ready"
  | "claim_type"
  | "status"
  | "created_at"
  | "response_deadline"
  | "evidence_deadline"
  | "verdict"
  | "execution_status"
>;

export type GavelEvidenceRaw = {
  case_id: number;
  description: string;
  evidence_sha256: string;
  evidence_type: GavelEvidenceType;
  evidence_url: string;
  index: number;
  side: GavelEvidenceSide;
  submitted_at: number;
};

export type GavelAgentPage = {
  items: GavelAgentRaw[];
  next_cursor: number;
  has_more: boolean;
};

export type GavelAgreementPage = {
  items: GavelAgreementSummaryRaw[];
  next_cursor: number;
  has_more: boolean;
};

export type GavelCasePage = {
  items: GavelCaseSummaryRaw[];
  next_cursor: number;
  has_more: boolean;
};

export type GavelCaseDetailRaw = {
  case: GavelCaseRaw;
  agreement: GavelAgreementRaw;
  plaintiff_evidence: GavelEvidenceRaw[];
  defendant_evidence: GavelEvidenceRaw[];
};

export type TimelineEvent = { label: string; date: string; detail: string };

export type Evidence = {
  id: string;
  type: string;
  side: "Plaintiff" | "Defendant";
  at: string;
  description: string;
  reference: string;
  sha256: string;
};

export type CourtCase = {
  id: string;
  title: string;
  plaintiff: string;
  defendant: string;
  plaintiffAddress: string;
  plaintiffReady: boolean;
  defendantAddress: string;
  defendantReady: boolean;
  claimType: string;
  claim: string;
  agreementId: string;
  escrow: string;
  status: GavelCaseStatus;
  filed: string;
  responseDeadline: string;
  evidenceDeadline: string;
  responseDeadlineAt: number;
  evidenceDeadlineAt: number;
  agreementTitle: string;
  agreementTerms: string;
  clientAddress: string;
  providerAddress: string;
  plaintiffAgreementRole: "Client" | "Provider" | "Unknown";
  defendantAgreementRole: "Client" | "Provider" | "Unknown";
  claimBody: string;
  defence: string;
  hasDefence: boolean;
  plaintiffEvidenceCount: number;
  defendantEvidenceCount: number;
  evidence: Evidence[];
  judgment?: string;
  reason?: string;
  verdict?: string;
  execution: string;
  history: TimelineEvent[];
};

export type Agreement = {
  id: string;
  title: string;
  client: string;
  provider: string;
  clientAddress: string;
  providerAddress: string;
  escrow: string;
  escrowWei: bigint;
  status: GavelAgreementStatus;
  accepted: boolean;
  caseId?: string;
  acceptDeadline: string;
  acceptDeadlineAt: number;
  date: string;
  terms: string;
  released: string;
  history: TimelineEvent[];
};

export type Agent = {
  id: string;
  name: string;
  address: string;
  isRegistered: boolean;
  registered: string;
  finalized: number;
  plaintiffWins: number;
  defendantWins: number;
  inconclusive: number;
};
