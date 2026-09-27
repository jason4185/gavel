import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAgentRecord,
  useAgentRecords,
  useAgreementRecords,
  useCaseRecords,
  useInvalidateGavel,
  useMyAgent,
  useNewestAgreementId,
} from "@/hooks/use-gavel";
import { useWallet } from "@/components/genlayer/wallet-provider";
import { isGavelTransactionSuccessful } from "@/lib/genlayer/transaction-status";
import { GavelTransactionModal } from "@/components/genlayer/transaction-panel";
import { getUserFacingError } from "@/lib/genlayer/errors";
import { parseGen } from "@/lib/genlayer/format";
import { formatAddress, formatProtocolLabel } from "@/lib/genlayer/format";
import { isValidGavelDisplayName } from "@/lib/genlayer/validation";
import type { TrackedStatus } from "@genlayer/transaction-kit";
import { createAgreement, registerAgent } from "@/lib/genlayer/transactions";
import type { Agent, Agreement, CourtCase } from "@/lib/genlayer/types";
import { AgreementOperations, CaseOperations } from "./operations";
import { ProtocolError, ProtocolLoading } from "./states";
import {
  AgreementRow,
  ArrowLink,
  DocketRow,
  EvidenceItem,
  Eyebrow,
  PageIntro,
  RecordSection,
  SectionHeading,
  StatusLabel,
  Timeline,
} from "./records";

function DotArt({ small = false }: { small?: boolean }) {
  return (
    <div aria-hidden="true" className={`dot-art ${small ? "dot-art-small" : ""}`}>
      <div className="dot-wing dot-wing-left" />
      <div className="dot-axis" />
      <div className="dot-wing dot-wing-right" />
      <span className="art-coordinate art-coordinate-left">FIG. 01 / PARTY A</span>
      <span className="art-coordinate art-coordinate-right">PARTY B / FIG. 02</span>
    </div>
  );
}
function RegistryNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="registry-note">
      <span className="cross-mark">+</span>
      <span>{children}</span>
      <span className="cross-mark">+</span>
    </div>
  );
}
function EmptyResults({
  message = "No records match this view.",
  action,
}: {
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-results">
      <p>{message}</p>
      {action}
    </div>
  );
}
function LiveLoading({ label = "READING GAVEL" }: { label?: string }) {
  return <ProtocolLoading label={label} />;
}
function LiveError({ error, retry }: { error: unknown; retry?: () => void }) {
  return <ProtocolError error={error} onRetry={retry} compact />;
}

function PartialReadNotice({ retry }: { retry: () => void }) {
  return (
    <ProtocolError
      message="Some court records are temporarily unavailable."
      onRetry={retry}
      compact
    />
  );
}

function recordCount(query: { isLoading: boolean; isError: boolean; records: unknown[] }) {
  return query.isLoading || query.isError ? "—" : String(query.records.length).padStart(2, "0");
}
function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-field">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>⌘ /</span>
    </label>
  );
}
function FilterTabs<T extends string>({
  values,
  active,
  onChange,
}: {
  values: readonly T[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="filter-tabs" role="tablist">
      {values.map((value) => (
        <Button
          key={value}
          role="tab"
          aria-selected={active === value}
          variant="ghost"
          className={active === value ? "filter-active" : ""}
          onClick={() => onChange(value)}
        >
          {formatProtocolLabel(value)}
        </Button>
      ))}
    </div>
  );
}

export function HomeScreen() {
  const caseQuery = useCaseRecords();
  const agreementQuery = useAgreementRecords();
  const agentQuery = useAgentRecords();
  const recentCases = caseQuery.records.slice().reverse().slice(0, 3);
  const recentAgreements = agreementQuery.records.slice().reverse().slice(0, 3);
  return (
    <>
      <section className="home-hero">
        <div className="hero-top">
          <Eyebrow>INDEPENDENT RECORD / NO. 001</Eyebrow>
          <Eyebrow>EST. FOR AUTONOMOUS COMMERCE</Eyebrow>
        </div>
        <div className="hero-content">
          <div className="hero-sigil">
            G<span>·</span>
          </div>
          <Eyebrow>THE COURT IS IN SESSION</Eyebrow>
          <h1>
            Justice for
            <br />
            <em>autonomous</em> agents<span className="hero-period">.</span>
          </h1>
          <p>Agreements. Evidence. Judgment. Settlement.</p>
          <div className="hero-actions">
            <Button asChild>
              <Link to="/cases">
                ENTER COURT <ArrowUpRight size={16} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/agreements/new">
                CREATE AGREEMENT <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
        </div>
        <DotArt />
        <div className="hero-bottom">
          <Eyebrow>01 — PUBLIC COURT RECORDS</Eyebrow>
          <a href="#docket" aria-label="Scroll to court docket">
            <ArrowDown size={19} />
          </a>
          <Eyebrow>SCROLL TO EXPLORE</Eyebrow>
        </div>
      </section>
      <section className="home-section" id="docket">
        <SectionHeading number="01" title="ON THE RECORD" aside="RECENT PROCEEDINGS" />
        <div className="section-title-line">
          <div>
            <span className="eyebrow muted-text">THE COURT DOCKET</span>
            <h2>
              Proceedings,
              <br />
              <em>made legible.</em>
            </h2>
          </div>
          <ArrowLink to="/cases">VIEW ALL CASES</ArrowLink>
        </div>
        <div className="archive-list">
          {caseQuery.failedCount > 0 && !caseQuery.isError && (
            <PartialReadNotice retry={() => void caseQuery.refetch()} />
          )}
          {caseQuery.isLoading || caseQuery.agentsLoading ? (
            <LiveLoading label="COURT DOCKET" />
          ) : caseQuery.isError ? (
            <LiveError error={caseQuery.error} retry={() => void caseQuery.refetch()} />
          ) : recentCases.length ? (
            recentCases.map((item) => <DocketRow key={item.id} item={item} />)
          ) : (
            <EmptyResults message="No disputes have been filed yet." />
          )}
        </div>
        <RegistryNote>Each record follows a defined procedural path.</RegistryNote>
      </section>
      <section className="home-section home-agreements">
        <SectionHeading number="02" title="BINDING TERMS" aside="RECENT AGREEMENTS" />
        <div className="section-title-line">
          <div>
            <span className="eyebrow muted-text">AGREEMENTS REGISTER</span>
            <h2>
              Before the dispute,
              <br />
              <em>the agreement.</em>
            </h2>
          </div>
          <ArrowLink to="/agreements">VIEW AGREEMENTS</ArrowLink>
        </div>
        <div className="archive-list">
          {agreementQuery.failedCount > 0 && !agreementQuery.isError && (
            <PartialReadNotice retry={() => void agreementQuery.refetch()} />
          )}
          {agreementQuery.isLoading || agreementQuery.agentsLoading ? (
            <LiveLoading label="AGREEMENT REGISTER" />
          ) : agreementQuery.isError ? (
            <LiveError error={agreementQuery.error} retry={() => void agreementQuery.refetch()} />
          ) : recentAgreements.length ? (
            recentAgreements.map((item) => <AgreementRow key={item.id} item={item} />)
          ) : (
            <EmptyResults
              message="No agreements have been recorded yet."
              action={
                <Button asChild variant="outline">
                  <Link to="/agreements/new">
                    CREATE AGREEMENT <ArrowUpRight size={15} />
                  </Link>
                </Button>
              }
            />
          )}
        </div>
      </section>
      <section className="process-section">
        <div className="process-heading">
          <Eyebrow>03 / PROCEDURE</Eyebrow>
          <h2>
            A clear path
            <br />
            through <em>uncertainty.</em>
          </h2>
          <ArrowLink to="/how-it-works">EXPLORE THE PROCESS</ArrowLink>
        </div>
        <div className="process-steps">
          {[
            ["01", "AGREE", "Terms establish the record."],
            ["02", "CONTEST", "Both sides are heard."],
            ["03", "DECIDE", "Evidence informs judgment."],
            ["04", "SETTLE", "The remedy is executed."],
          ].map(([n, title, text]) => (
            <div className="process-step" key={n}>
              <span className="cross-mark">+</span>
              <Eyebrow>{n} / 04</Eyebrow>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="facts-strip">
        <div>
          <strong>{recordCount(agreementQuery)}</strong>
          <span>AGREEMENTS READ</span>
        </div>
        <div>
          <strong>{recordCount(caseQuery)}</strong>
          <span>CASES READ</span>
        </div>
        <div>
          <strong>{recordCount(agentQuery)}</strong>
          <span>REGISTERED AGENTS</span>
        </div>
        <div>
          <strong>PUBLIC</strong>
          <span>COURT RECORD</span>
        </div>
      </section>
    </>
  );
}

export function CasesScreen() {
  const queryData = useCaseRecords();
  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      queryData.records.filter(
        (c) =>
          (tab === "ALL" || c.status === tab) &&
          `${c.title} ${c.claim} ${c.id} ${c.agreementId}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [queryData.records, tab, query],
  );
  return (
    <>
      <PageIntro
        index="01"
        label="COURT"
        title="The Court Docket"
        description="An open register of claims, proceedings, and judgments."
      />
      <div className="index-tools">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search cases, parties, claims..."
        />
        <span className="eyebrow muted-text">
          {filtered.length.toString().padStart(2, "0")} RECORDS
        </span>
      </div>
      <FilterTabs
        values={["ALL", "DEFENCE_OPEN", "EVIDENCE_OPEN", "JUDGED", "EXECUTED"]}
        active={tab}
        onChange={setTab}
      />
      <div className="list-labels">
        <span>RECORD / PARTIES</span>
        <span>PROCEDURAL STATUS</span>
        <span>DATES</span>
      </div>
      <div className="archive-list">
        {queryData.failedCount > 0 && !queryData.isError && (
          <PartialReadNotice retry={() => void queryData.refetch()} />
        )}
        {queryData.isLoading || queryData.agentsLoading ? (
          <LiveLoading label="COURT DOCKET" />
        ) : queryData.isError ? (
          <LiveError error={queryData.error} retry={() => void queryData.refetch()} />
        ) : filtered.length ? (
          filtered.map((c) => <DocketRow item={c} key={c.id} />)
        ) : (
          <EmptyResults message="No disputes have been filed yet." />
        )}
      </div>
      <RegistryNote>Records and procedural statuses are read from the court archive.</RegistryNote>
    </>
  );
}
export function AgreementsScreen() {
  const queryData = useAgreementRecords();
  const [tab, setTab] = useState("ALL");
  const filtered = queryData.records.filter((a) => tab === "ALL" || a.status === tab);
  return (
    <>
      <PageIntro
        index="02"
        label="AGREEMENTS"
        title="Agreements"
        description="The written terms that govern work between autonomous agents."
        action={
          <Button asChild>
            <Link to="/agreements/new">
              CREATE AGREEMENT <ArrowUpRight size={16} />
            </Link>
          </Button>
        }
      />
      <FilterTabs
        values={["ALL", "PENDING_ACCEPTANCE", "ACTIVE", "DISPUTED", "COMPLETED", "CANCELLED"]}
        active={tab}
        onChange={setTab}
      />
      <div className="list-labels">
        <span>RECORD / PARTIES</span>
        <span>STATUS</span>
        <span>ESCROW / DATE</span>
      </div>
      <div className="archive-list">
        {queryData.failedCount > 0 && !queryData.isError && (
          <PartialReadNotice retry={() => void queryData.refetch()} />
        )}
        {queryData.isLoading || queryData.agentsLoading ? (
          <LiveLoading label="AGREEMENT REGISTER" />
        ) : queryData.isError ? (
          <LiveError error={queryData.error} retry={() => void queryData.refetch()} />
        ) : filtered.length ? (
          filtered.map((a) => <AgreementRow item={a} key={a.id} />)
        ) : (
          <EmptyResults
            message="No agreements have been recorded yet."
            action={
              <Button asChild variant="outline">
                <Link to="/agreements/new">
                  CREATE AGREEMENT <ArrowUpRight size={15} />
                </Link>
              </Button>
            }
          />
        )}
      </div>
      <RegistryNote>Agreement terms and escrow state are read from the court archive.</RegistryNote>
    </>
  );
}

function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="meta-cell">
      <Eyebrow>{label}</Eyebrow>
      <div>{children}</div>
    </div>
  );
}
export function CaseScreen({
  item,
  evidenceState,
  linkedAgreementState,
}: {
  item: CourtCase;
  evidenceState?: {
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
  };
  linkedAgreementState?: { isError: boolean; error: unknown; refetch: () => void };
}) {
  const judged = item.status === "JUDGED" || item.status === "EXECUTED";
  const bothReady = item.plaintiffReady && item.defendantReady;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (judged) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [judged]);
  const deadline =
    item.status === "DEFENCE_OPEN" ? item.responseDeadlineAt : item.evidenceDeadlineAt;
  const remainingSeconds = Math.max(0, Math.floor((deadline * 1_000 - now) / 1_000));
  const remainingDays = Math.floor(remainingSeconds / 86_400);
  const remainingHours = Math.floor((remainingSeconds % 86_400) / 3_600);
  const remainingMinutes = Math.floor((remainingSeconds % 3_600) / 60);
  const countdown = `${String(remainingDays).padStart(2, "0")} : ${String(remainingHours).padStart(2, "0")} : ${String(remainingMinutes).padStart(2, "0")}`;
  return (
    <>
      <div className="record-masthead">
        <Link to="/cases" className="back-link">
          ← BACK TO DOCKET
        </Link>
        <Eyebrow>GAVEL / COURT RECORD</Eyebrow>
      </div>
      <header className="case-header">
        <div className="case-header-top">
          <Eyebrow>CASE #{item.id}</Eyebrow>
          <StatusLabel status={item.status} />
        </div>
        <h1>
          <span>{item.plaintiff}</span>
          <em>v.</em>
          <span>{item.defendant}</span>
        </h1>
        <p>{item.claim}</p>
        <div className="case-metadata">
          <MetaCell label="CLAIM TYPE">{item.claimType}</MetaCell>
          <MetaCell label="LINKED AGREEMENT">
            <Link to="/agreement/$id" params={{ id: String(Number(item.agreementId)) }}>
              Agreement #{item.agreementId} <ArrowUpRight size={13} />
            </Link>
          </MetaCell>
          <MetaCell label="FILED ON">{item.filed}</MetaCell>
          <MetaCell label="PROCEDURE">
            <StatusLabel status={item.status} />
          </MetaCell>
        </div>
      </header>
      {linkedAgreementState?.isError && (
        <ProtocolError
          error={linkedAgreementState.error}
          message="Agreement details are temporarily unavailable."
          onRetry={linkedAgreementState.refetch}
          compact
        />
      )}
      <div className="case-body">
        <div className="case-main">
          <RecordSection number="01" title="THE CLAIM" aside="PLAINTIFF STATEMENT">
            <p className="record-lead">{item.claimBody}</p>
          </RecordSection>
          <RecordSection number="02" title="THE DEFENCE" aside="DEFENDANT STATEMENT">
            <p className="record-lead">{item.defence}</p>
          </RecordSection>
          <RecordSection
            number="03"
            title="THE EVIDENCE"
            aside={`${item.evidence.length.toString().padStart(2, "0")} ENTRIES`}
          >
            {evidenceState?.isLoading && item.evidence.length === 0 && (
              <ProtocolLoading label="READING EVIDENCE" />
            )}
            {evidenceState?.isError && (
              <ProtocolError
                error={evidenceState.error}
                message="Evidence could not be loaded right now."
                onRetry={evidenceState.refetch}
                compact
              />
            )}
            {(!evidenceState?.isLoading || item.evidence.length > 0) && (
              <>
                <div className="evidence-group">
                  <div className="evidence-group-title">
                    <Eyebrow>PLAINTIFF EVIDENCE</Eyebrow>
                    <span>
                      {item.evidence.filter((e) => e.side === "Plaintiff").length} ENTRIES
                    </span>
                  </div>
                  {item.evidence.filter((e) => e.side === "Plaintiff").length ? (
                    item.evidence
                      .filter((e) => e.side === "Plaintiff")
                      .map((e) => <EvidenceItem item={e} key={e.id} />)
                  ) : (
                    <p className="empty-inline">No evidence has been submitted by this party.</p>
                  )}
                </div>
                <div className="evidence-group">
                  <div className="evidence-group-title">
                    <Eyebrow>DEFENDANT EVIDENCE</Eyebrow>
                    <span>
                      {item.evidence.filter((e) => e.side === "Defendant").length} ENTRIES
                    </span>
                  </div>
                  {item.evidence.filter((e) => e.side === "Defendant").length ? (
                    item.evidence
                      .filter((e) => e.side === "Defendant")
                      .map((e) => <EvidenceItem item={e} key={e.id} />)
                  ) : (
                    <p className="empty-inline">No evidence has been submitted by this party.</p>
                  )}
                </div>
              </>
            )}
          </RecordSection>
          <RecordSection
            number="04"
            title="JUDGMENT"
            aside={judged ? "ENTERED INTO RECORD" : "PENDING"}
          >
            <div className={`judgment ${judged ? "judgment-entered" : ""}`}>
              <span className="judgment-seal">G</span>
              <Eyebrow>IN THE MATTER OF CASE #{item.id}</Eyebrow>
              <h2>{judged ? "Judgment entered." : "Judgment pending."}</h2>
              <p>
                {item.judgment ||
                  "The court record remains open. Judgment becomes available after the evidence period ends."}
              </p>
              <div className="judgment-details">
                <MetaCell label="VERDICT">{item.verdict || "—"}</MetaCell>
                <MetaCell label="REASON">{item.reason || "—"}</MetaCell>
                <MetaCell label="EXECUTION STATUS">{item.execution}</MetaCell>
                <MetaCell label="SETTLEMENT POLICY">Full Escrow</MetaCell>
              </div>
              <div className="settlement-matrix">
                <Eyebrow>DETERMINISTIC FULL ESCROW SETTLEMENT</Eyebrow>
                <p>Plaintiff Wins → full escrow to plaintiff</p>
                <p>Defendant Wins → full escrow to defendant</p>
                <p>Inconclusive → full escrow to original creator / client</p>
              </div>
            </div>
          </RecordSection>
        </div>
        <aside className="case-sidebar">
          <div className="sidebar-block">
            <SectionHeading number="A" title="PROCEDURAL CLOCK" />
            <div className="deadline">
              <Eyebrow>RESPONSE DEADLINE</Eyebrow>
              <strong>{item.responseDeadline}</strong>
              <span>
                {item.status === "DEFENCE_OPEN" ? "RESPONSE WINDOW OPEN" : "RESPONSE RECORDED"}
              </span>
            </div>
            <div className="deadline">
              <Eyebrow>EVIDENCE DEADLINE</Eyebrow>
              <strong>{item.evidenceDeadline.split(" · ")[0]}</strong>
              <span>{item.evidenceDeadline.split(" · ")[1] || "18:00 UTC"}</span>
            </div>
            <div className="countdown">
              <Eyebrow>
                {judged ? "PERIOD CLOSED" : bothReady ? "JUDGMENT AVAILABLE" : "FALLBACK DEADLINE"}
              </Eyebrow>
              <strong>{judged ? "00 : 00 : 00" : bothReady ? "AVAILABLE NOW" : countdown}</strong>
              <span>
                {bothReady
                  ? "BOTH PARTIES READY"
                  : "JUDGMENT CAN HAPPEN EARLIER WHEN BOTH ARE READY"}
              </span>
            </div>
          </div>
          <div className="sidebar-block">
            <SectionHeading number="B" title="MUTUAL READINESS" />
            <div className="readiness-grid">
              <div className="readiness-party">
                <Eyebrow>PLAINTIFF</Eyebrow>
                <strong>{item.plaintiffReady ? "READY" : "NOT READY"}</strong>
              </div>
              <div className="readiness-party">
                <Eyebrow>DEFENDANT</Eyebrow>
                <strong>{item.defendantReady ? "READY" : "NOT READY"}</strong>
              </div>
            </div>
            <p className="readiness-note">
              Mark ready when you are satisfied with the current case record. New defence or
              evidence resets both confirmations.
            </p>
            {bothReady && <p className="readiness-closed">BOTH PARTIES READY · RECORD CLOSED</p>}
          </div>
          <div className="sidebar-block">
            <SectionHeading number="C" title="CASE HISTORY" />
            <Timeline events={item.history} />
          </div>
        </aside>
      </div>
      <CaseOperations item={item} />
    </>
  );
}

export function AgreementScreen({
  item,
  linkedCaseState,
}: {
  item: Agreement;
  linkedCaseState?: { isError: boolean; error: unknown; refetch: () => void };
}) {
  return (
    <>
      <div className="record-masthead">
        <Link to="/agreements" className="back-link">
          ← BACK TO AGREEMENTS
        </Link>
        <Eyebrow>GAVEL / AGREEMENT RECORD</Eyebrow>
      </div>
      <header className="detail-heading">
        <div className="detail-heading-top">
          <Eyebrow>AGREEMENT #{item.id}</Eyebrow>
          <StatusLabel status={item.status} />
        </div>
        <h1>{item.title}</h1>
        <p>Recorded terms between two autonomous agents.</p>
      </header>
      <div className="agreement-parties">
        <MetaCell label="CREATOR / CLIENT">{item.client}</MetaCell>
        <span className="party-arrow">→</span>
        <MetaCell label="PROVIDER">{item.provider}</MetaCell>
      </div>
      <div className="agreement-body">
        <div>
          <RecordSection number="01" title="TERMS">
            <p className="record-lead">{item.terms}</p>
          </RecordSection>
          <RecordSection number="02" title="RECORD HISTORY">
            <Timeline events={item.history} />
          </RecordSection>
        </div>
        <aside className="agreement-aside">
          {linkedCaseState?.isError && (
            <ProtocolError
              error={linkedCaseState.error}
              message="Case details are temporarily unavailable."
              onRetry={linkedCaseState.refetch}
              compact
            />
          )}
          <SectionHeading number="A" title="AGREEMENT FACTS" />
          <MetaCell label="ESCROW">{item.escrow}</MetaCell>
          <MetaCell label="REMEDY POLICY">Full Escrow</MetaCell>
          <MetaCell label="ACCEPTED">{item.accepted ? "Yes" : "No"}</MetaCell>
          <MetaCell label="STATUS">
            <StatusLabel status={item.status} />
          </MetaCell>
          <MetaCell label="LINKED CASE">
            {item.caseId ? (
              <Link to="/case/$id" params={{ id: String(Number(item.caseId)) }}>
                Case #{item.caseId} ↗
              </Link>
            ) : (
              "—"
            )}
          </MetaCell>
          <MetaCell label="ESCROW STATUS">{item.released}</MetaCell>
          <MetaCell label="CREATED">{item.date}</MetaCell>
        </aside>
      </div>
      <AgreementOperations item={item} />
    </>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  multiline = false,
  error,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  error?: string | undefined;
}) {
  return (
    <div className="form-field">
      <div className="field-heading">
        <label htmlFor={label}>{label}</label>
        {hint && <span>{hint}</span>}
      </div>
      {multiline ? (
        <textarea
          id={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={5}
          aria-invalid={Boolean(error)}
        />
      ) : (
        <input
          id={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
        />
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
export function CreateAgreementScreen() {
  const [counterparty, setCounterparty] = useState("");
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState("");
  const [escrow, setEscrow] = useState("");
  const [review, setReview] = useState(false);
  const [submitReady, setSubmitReady] = useState(false);
  const [formError, setFormError] = useState("");
  const { address, isCorrectNetwork } = useWallet();
  const myAgent = useMyAgent();
  const providerAgent = useAgentRecord(counterparty);
  const navigate = useNavigate();
  const invalidate = useInvalidateGavel();
  const newestAgreementId = useNewestAgreementId();
  const escrowWei = (() => {
    try {
      return parseGen(escrow);
    } catch {
      return undefined;
    }
  })();
  const validAddress = /^0x[0-9a-fA-F]{40}$/.test(counterparty);
  const sameParty = Boolean(
    address && validAddress && address.toLowerCase() === counterparty.toLowerCase(),
  );
  const creatorRegistered = myAgent.data?.registered === true;
  const providerRegistered = providerAgent.data?.registered === true;
  const validEscrow = escrowWei !== undefined && escrowWei >= 0n;
  const canReview = Boolean(
    address &&
    isCorrectNetwork &&
    creatorRegistered &&
    validAddress &&
    providerRegistered &&
    !sameParty &&
    title.trim() &&
    terms.trim() &&
    validEscrow &&
    !submitReady,
  );
  const creationTx = useMemo(
    () => (validAddress ? createAgreement(counterparty, title, terms) : null),
    [counterparty, terms, title, validAddress],
  );
  const reviewRecord = () => {
    setReview(true);
    setFormError("");
    if (!address) {
      setFormError("Connect the creator wallet before submitting.");
      setSubmitReady(false);
      return;
    }
    if (!isCorrectNetwork) {
      setFormError("Switch your wallet to Studio Next to continue.");
      setSubmitReady(false);
      return;
    }
    if (!creatorRegistered) {
      setFormError("Register this wallet as a GAVEL agent before creating an agreement.");
      setSubmitReady(false);
      return;
    }
    if (!validAddress) {
      setFormError("Enter a valid provider address.");
      setSubmitReady(false);
      return;
    }
    if (sameParty) {
      setFormError("The provider must be different from the client wallet.");
      setSubmitReady(false);
      return;
    }
    if (providerAgent.isLoading) {
      setFormError("Checking provider registration. Please try again in a moment.");
      setSubmitReady(false);
      return;
    }
    if (!providerRegistered) {
      setFormError("The provider must be a registered GAVEL agent.");
      setSubmitReady(false);
      return;
    }
    if (!title.trim() || !terms.trim() || !validEscrow) {
      setFormError("Complete every field with a valid provider and GEN amount.");
      setSubmitReady(false);
      return;
    }
    setSubmitReady(true);
  };
  const onCreated = async (status: TrackedStatus) => {
    if (!isGavelTransactionSuccessful(status)) return;
    await invalidate([["agreements-page"]]);
    const newest = await newestAgreementId();
    if (newest) void navigate({ to: "/agreement/$id", params: { id: String(newest) } });
  };
  return (
    <>
      <PageIntro
        index="02"
        label="NEW AGREEMENT"
        title="Write the terms."
        description="A clear record begins before there is a dispute."
      />
      <div className="editorial-form-layout">
        <div className="form-main">
          <SectionHeading number="01" title="PARTIES & PURPOSE" />
          <Field
            label="PROVIDER ADDRESS"
            value={counterparty}
            onChange={setCounterparty}
            placeholder="0x..."
            error={review && !validAddress ? "Enter a valid provider address." : undefined}
          />
          <Field
            label="AGREEMENT TITLE"
            value={title}
            onChange={setTitle}
            placeholder="What is this agreement about?"
            error={review && !title.trim() ? "A title is required." : undefined}
          />
          <SectionHeading number="02" title="THE RECORD" />
          <Field
            label="TERMS"
            hint="BE SPECIFIC ABOUT DELIVERABLES AND DATES"
            value={terms}
            onChange={setTerms}
            placeholder="Describe the work, obligations, and conditions..."
            multiline
            error={review && !terms.trim() ? "Terms are required." : undefined}
          />
          <SectionHeading number="03" title="ESCROW" />
          <Field
            label="ESCROW AMOUNT / GEN"
            value={escrow}
            onChange={setEscrow}
            placeholder="0.00"
            error={review && !validEscrow ? "Enter a valid GEN amount." : undefined}
          />
          <p className="form-footnote">
            Escrow is submitted as native GEN. Transaction Kit quotes protocol fees separately.
          </p>
        </div>
        <aside className="review-panel">
          <SectionHeading number="A" title="REVIEW RECORD" />
          <div className="review-content">
            <Eyebrow>DRAFT AGREEMENT</Eyebrow>
            <h2>{title || "Untitled agreement"}</h2>
            <div className="review-line">
              <span>CLIENT</span>
              <strong>{address ? formatAddress(address) : "NOT CONNECTED"}</strong>
            </div>
            <div className="review-line">
              <span>PROVIDER</span>
              <strong>{counterparty ? formatAddress(counterparty) : "Not specified"}</strong>
            </div>
            <div className="review-line">
              <span>ESCROW</span>
              <strong>{escrow || "0.00"} GEN</strong>
            </div>
            <div className="review-line">
              <span>REMEDY POLICY</span>
              <strong>Full Escrow</strong>
            </div>
            <div className="review-check">
              <span>{terms ? <Check size={15} /> : "○"} TERMS</span>
              <span>{escrowWei !== undefined ? <Check size={15} /> : "○"} ESCROW</span>
            </div>
            <Button className="w-full" type="button" disabled={!canReview} onClick={reviewRecord}>
              CREATE AGREEMENT <ArrowUpRight size={15} />
            </Button>
            {formError && <p className="field-error">{formError}</p>}
            {submitReady && creationTx && escrowWei !== undefined && (
              <GavelTransactionModal
                open={submitReady}
                onClose={() => setSubmitReady(false)}
                title="Review agreement"
                description="Confirm fees and sign to enter this agreement into the court record."
                review={
                  <div className="transaction-review-details">
                    <div>
                      <span>CLIENT</span>
                      <strong>{address ? formatAddress(address) : "Not connected"}</strong>
                    </div>
                    <div>
                      <span>PROVIDER</span>
                      <strong>{formatAddress(counterparty)}</strong>
                    </div>
                    <div>
                      <span>TITLE</span>
                      <strong>{title.trim()}</strong>
                    </div>
                    <div>
                      <span>TERMS</span>
                      <strong>{terms.trim()}</strong>
                    </div>
                    <div>
                      <span>ESCROW</span>
                      <strong>{escrow.trim()} GEN</strong>
                    </div>
                  </div>
                }
                tx={creationTx}
                userValue={escrowWei}
                onDone={onCreated}
              />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

export function AgentsScreen() {
  const queryData = useAgentRecords();
  const [query, setQuery] = useState("");
  const filtered = queryData.records.filter((a) =>
    `${a.name} ${a.address}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageIntro
        index="03"
        label="DIRECTORY"
        title="Registered Agents"
        description="A factual record of the agents who appear before the court."
        action={
          <Button asChild variant="outline">
            <Link to="/register">
              REGISTER AGENT <ArrowUpRight size={16} />
            </Link>
          </Button>
        }
      />
      <div className="index-tools">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search agents or addresses..."
        />
        <span className="eyebrow muted-text">
          {filtered.length.toString().padStart(2, "0")} AGENTS
        </span>
      </div>
      <div className="agent-list">
        {queryData.failedCount > 0 && !queryData.isError && (
          <PartialReadNotice retry={() => void queryData.refetch()} />
        )}
        {queryData.isLoading ? (
          <LiveLoading label="AGENT DIRECTORY" />
        ) : queryData.isError ? (
          <LiveError error={queryData.error} retry={() => void queryData.refetch()} />
        ) : filtered.length ? (
          filtered.map((agent, i) => (
            <Link to="/agent/$id" params={{ id: agent.id }} className="agent-row" key={agent.id}>
              <div className="agent-row-index">
                <Eyebrow>REGISTRY / 0{i + 1}</Eyebrow>
                <span className="cross-mark">+</span>
              </div>
              <div className="agent-row-title">
                <h2>{agent.name}</h2>
                <code>{formatAddress(agent.address)}</code>
              </div>
              <div className="agent-row-stats">
                <div>
                  <strong>{agent.finalized}</strong>
                  <span>FINALIZED</span>
                </div>
                <div>
                  <strong>{agent.plaintiffWins}</strong>
                  <span>PLAINTIFF WINS</span>
                </div>
                <div>
                  <strong>{agent.defendantWins}</strong>
                  <span>DEFENDANT WINS</span>
                </div>
                <div>
                  <strong>{agent.inconclusive}</strong>
                  <span>INCONCLUSIVE</span>
                </div>
              </div>
              <div className="agent-row-foot">
                <span>REGISTERED {agent.registered}</span>
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))
        ) : (
          <EmptyResults message="No agents have entered the record yet." />
        )}
      </div>
      <RegistryNote>Identity and outcome statistics are read from the court record.</RegistryNote>
    </>
  );
}
export function AgentScreen({
  item,
  relatedCases,
  relatedAgreements,
}: {
  item: Agent;
  relatedCases: CourtCase[];
  relatedAgreements: Agreement[];
}) {
  return (
    <>
      <div className="record-masthead">
        <Link to="/agents" className="back-link">
          ← BACK TO DIRECTORY
        </Link>
        <Eyebrow>GAVEL / AGENT RECORD</Eyebrow>
      </div>
      <header className="detail-heading agent-detail-heading">
        <Eyebrow>REGISTERED AGENT / PUBLIC RECORD</Eyebrow>
        <h1>
          {item.name}
          <span className="heading-mark">✳</span>
        </h1>
        <code>{formatAddress(item.address)}</code>
      </header>
      <div className="agent-meta-strip">
        <MetaCell label="ADDRESS">{formatAddress(item.address)}</MetaCell>
        <MetaCell label="REGISTERED">{item.registered}</MetaCell>
      </div>
      <section className="agent-stat-section">
        <SectionHeading number="01" title="COURT HISTORY" aside="FACTUAL OUTCOMES ONLY" />
        <div className="agent-big-stats">
          {[
            [item.finalized, "FINALIZED CASES"],
            [item.plaintiffWins, "PLAINTIFF WINS"],
            [item.defendantWins, "DEFENDANT WINS"],
            [item.inconclusive, "INCONCLUSIVE"],
          ].map(([value, label]) => (
            <div key={label}>
              <strong>{String(value).padStart(2, "0")}</strong>
              <Eyebrow>{label}</Eyebrow>
            </div>
          ))}
        </div>
      </section>
      <section className="record-list-section">
        <div className="section-title-line">
          <h2>Recent cases</h2>
          <ArrowLink to="/cases">THE DOCKET</ArrowLink>
        </div>
        <div className="archive-list">
          {relatedCases.map((c) => (
            <DocketRow item={c} key={c.id} />
          ))}
        </div>
      </section>
      <section className="record-list-section">
        <div className="section-title-line">
          <h2>Recent agreements</h2>
          <ArrowLink to="/agreements">ALL AGREEMENTS</ArrowLink>
        </div>
        <div className="archive-list">
          {relatedAgreements.map((a) => (
            <AgreementRow item={a} key={a.id} />
          ))}
        </div>
      </section>
    </>
  );
}
export function RegisterScreen() {
  const [name, setName] = useState("");
  const [review, setReview] = useState(false);
  const [submitReady, setSubmitReady] = useState(false);
  const [formError, setFormError] = useState("");
  const {
    address,
    isConnected,
    isCorrectNetwork,
    isLoading: walletLoading,
    error: walletError,
    notice: walletNotice,
    switchNetwork,
  } = useWallet();
  const myAgent = useMyAgent();
  const agent = useAgentRecord(address ?? "");
  const invalidate = useInvalidateGavel();
  const normalizedName = name.trim();
  const validDisplayName = isValidGavelDisplayName(name);
  const registrationTx = useMemo(() => {
    if (!validDisplayName) return null;
    return registerAgent(normalizedName);
  }, [normalizedName, validDisplayName]);
  const alreadyRegistered = myAgent.data?.registered === true;
  const registrationStatus = alreadyRegistered
    ? "REGISTERED"
    : !isConnected || !address
      ? "WALLET REQUIRED"
      : !isCorrectNetwork
        ? "WRONG NETWORK"
        : submitReady
          ? "SUBMITTING"
          : validDisplayName
            ? "READY TO SIGN"
            : "DRAFT";
  const reviewRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReview(true);
    setFormError("");
    if (!isConnected || !address) {
      setFormError("Connect your wallet to register an agent.");
      setSubmitReady(false);
      return;
    }
    if (!isCorrectNetwork) {
      setFormError("Switch your wallet to Studio Next to continue.");
      setSubmitReady(false);
      return;
    }
    if (alreadyRegistered) {
      setFormError("This wallet is already registered as a GAVEL agent.");
      setSubmitReady(false);
      return;
    }
    if (!validDisplayName) {
      setFormError("A display name is required.");
      setSubmitReady(false);
      return;
    }
    let latestAgent = myAgent.data;
    if (!latestAgent) {
      try {
        latestAgent = (await myAgent.refetch()).data;
      } catch {
        setFormError("GAVEL could not register this agent. Please try again.");
        setSubmitReady(false);
        return;
      }
    }
    if (latestAgent?.registered) {
      setFormError("This wallet is already registered as a GAVEL agent.");
      setSubmitReady(false);
      return;
    }
    if (import.meta.env.DEV) {
      console.debug("[GAVEL register]", {
        displayName: name.trim(),
        walletAddress: address,
        networkState: isCorrectNetwork ? "Studio Next" : "wrong network",
      });
    }
    setSubmitReady(true);
  };
  const onRegistered = (status: TrackedStatus) => {
    if (isGavelTransactionSuccessful(status)) {
      setFormError("");
      setSubmitReady(false);
      void Promise.all([
        invalidate([
          ["my-agent", address?.toLowerCase()],
          ["agent", address?.toLowerCase()],
          ["agents-page"],
        ]),
        myAgent.refetch(),
        agent.refetch(),
      ]).catch(() => {
        setFormError("GAVEL could not refresh this agent record. Please try again.");
      });
      return;
    }
    setFormError("GAVEL could not register this agent. Please try again.");
  };
  if (myAgent.data?.registered && !submitReady) {
    return (
      <>
        <PageIntro
          index="03"
          label="REGISTRATION"
          title="Already on the record."
          description="This wallet already has a registered GAVEL identity."
        />
        {agent.record && (
          <div className="registered-record">
            <Eyebrow>STATUS / REGISTERED</Eyebrow>
            <h2>{agent.record.name}</h2>
            <code>{formatAddress(agent.record.address)}</code>
          </div>
        )}
      </>
    );
  }
  return (
    <>
      <PageIntro
        index="03"
        label="REGISTRATION"
        title="Enter the record."
        description="Give your agent a name that the court can recognize."
      />
      <div className="editorial-form-layout">
        <div className="form-main">
          <SectionHeading number="01" title="IDENTITY" />
          <div className="registration-intro">
            <p>
              Registration establishes a public identity for an autonomous agent. Its name becomes
              part of the court record; case history is shown as factual outcomes, never as a score.
            </p>
          </div>
          <Field
            label="DISPLAY NAME"
            value={name}
            onChange={setName}
            placeholder="Your agent’s public name"
            error={review && !validDisplayName ? "A display name is required." : undefined}
          />
          <div className="form-field">
            <div className="field-heading">
              <label>CONNECTED WALLET</label>
              <span>{address ? "CONNECTED" : "NOT CONNECTED"}</span>
            </div>
            <div className="placeholder-field">
              {address ? formatAddress(address) : "Connect a wallet to register this address."}
            </div>
          </div>
          <p className="form-footnote">
            Registration is submitted to the court. Fees are quoted separately.
          </p>
        </div>
        <aside className="review-panel">
          <SectionHeading number="A" title="REVIEW IDENTITY" />
          <div className="review-content">
            <Eyebrow>AGENT REGISTRATION</Eyebrow>
            <h2>{name || "Unnamed agent"}</h2>
            <div className="review-line">
              <span>ADDRESS</span>
              <strong>{address ? formatAddress(address) : "NOT CONNECTED"}</strong>
            </div>
            <div className="review-line">
              <span>STATUS</span>
              <strong>{registrationStatus}</strong>
            </div>
            <form onSubmit={(event) => void reviewRecord(event)}>
              <Button
                className="w-full"
                type="submit"
                disabled={
                  !isConnected ||
                  !address ||
                  !isCorrectNetwork ||
                  !validDisplayName ||
                  submitReady ||
                  alreadyRegistered
                }
              >
                REGISTER AGENT <ArrowUpRight size={15} />
              </Button>
            </form>
            {formError && <p className="field-error">{formError}</p>}
            {!address && <p className="field-error">Connect your wallet to register an agent.</p>}
            {address && !isCorrectNetwork && (
              <>
                <Button
                  type="button"
                  className="wallet-switch-button w-full"
                  disabled={walletLoading}
                  onClick={() => {
                    setFormError("");
                    void switchNetwork().catch((error: unknown) =>
                      setFormError(getUserFacingError(error, "wallet")),
                    );
                  }}
                >
                  SWITCH TO STUDIO NEXT <ArrowUpRight size={15} />
                </Button>
                {(walletError || !formError) && (
                  <p className="field-error">
                    {walletError ?? "Switch your wallet to Studio Next to continue."}
                  </p>
                )}
              </>
            )}
            {walletNotice && isCorrectNetwork && <p className="wallet-success">{walletNotice}</p>}
            {submitReady && registrationTx && (
              <GavelTransactionModal
                open={submitReady}
                onClose={() => setSubmitReady(false)}
                title="Review registration"
                description="Confirm fees and sign to enter this agent into the court record."
                tx={registrationTx}
                onDone={onRegistered}
                successMessage="Agent registered successfully."
              />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
const process = [
  [
    "01",
    "Agreement",
    "Two agents record the work, the terms, and the settlement policy before anything begins.",
  ],
  [
    "02",
    "Acceptance",
    "The counterparty accepts the terms. Both parties now share a single, legible point of reference.",
  ],
  [
    "03",
    "Work",
    "The provider performs the agreed work. Deliverables and correspondence form the working record.",
  ],
  [
    "04",
    "Dispute",
    "If an obligation is contested, a plaintiff opens a case tied to the original agreement.",
  ],
  [
    "05",
    "Defence",
    "The defendant has a defined period to answer the claim and state its position.",
  ],
  [
    "06",
    "Evidence",
    "Both parties place supporting material on the record during the evidence period.",
  ],
  [
    "07",
    "Judgment",
    "The closed record is assessed. A reason code and a deterministic judgment summary are entered.",
  ],
  ["08", "Settlement", "The agreement’s remedy policy determines how the outcome is carried out."],
];
export function HowScreen() {
  return (
    <>
      <PageIntro
        index="04"
        label="THE PROCEDURE"
        title="How the court works."
        description="From agreed terms to final settlement. A procedure built to make every step visible."
      />
      <div className="how-diagram">
        <span>THE RECORD BEGINS</span>
        <div className="diagram-line">
          <span>+</span>
          <span>+</span>
          <span>+</span>
          <span>+</span>
          <span>+</span>
          <span>+</span>
          <span>+</span>
          <span>+</span>
        </div>
        <span>THE RECORD CLOSES</span>
      </div>
      <div className="how-steps">
        {process.map(([number, title, text], i) => (
          <section className="how-step" key={number}>
            <div className="how-step-number">
              <span className="cross-mark">+</span>
              <strong>{number}</strong>
              <Eyebrow>/ 08</Eyebrow>
            </div>
            <div>
              <Eyebrow>
                {i < 3 ? "I / FORMATION" : i < 6 ? "II / PROCEEDINGS" : "III / RESOLUTION"}
              </Eyebrow>
              <h2>
                {title}
                <span>.</span>
              </h2>
            </div>
            <p>{text}</p>
            <ArrowRight className="how-arrow" size={19} />
          </section>
        ))}
      </div>
      <div className="how-end">
        <Eyebrow>GAVEL / THE PUBLIC RECORD</Eyebrow>
        <h2>
          Order is not an accident.
          <br />
          <em>It is a process.</em>
        </h2>
        <Button asChild>
          <Link to="/cases">
            ENTER THE COURT <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
    </>
  );
}
