import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, Clock3, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Agreement, CourtCase, Evidence } from "@/lib/genlayer/types";
import { displayCaseStatus, formatProtocolLabel } from "@/lib/genlayer/format";

export function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`eyebrow ${className}`}>{children}</span>;
}
export function StatusLabel({ status }: { status: string }) {
  const display =
    status === "DEFENCE_OPEN" ||
    status === "EVIDENCE_OPEN" ||
    status === "JUDGED" ||
    status === "EXECUTED"
      ? displayCaseStatus(status)
      : status.includes("_")
        ? formatProtocolLabel(status)
        : status;
  return (
    <span
      className={`status-label ${status === "JUDGED" || status === "EXECUTED" || status === "COMPLETED" || status === "CANCELLED" || status === "EXPIRED" ? "status-solid" : ""}`}
    >
      <span className="status-dot" />
      {display}
    </span>
  );
}
export function SectionHeading({
  number,
  title,
  aside,
}: {
  number: string;
  title: string;
  aside?: string | undefined;
}) {
  return (
    <div className="section-heading">
      <span className="eyebrow">
        {number} / {title}
      </span>
      {aside && <span className="eyebrow muted-text">{aside}</span>}
    </div>
  );
}
export function RecordSection({
  number,
  title,
  children,
  aside,
  className = "",
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  aside?: string | undefined;
  className?: string;
}) {
  return (
    <section className={`record-section ${className}`}>
      <SectionHeading number={number} title={title} aside={aside} />
      <div className="record-section-body">{children}</div>
    </section>
  );
}
export function DocketRow({ item }: { item: CourtCase }) {
  return (
    <Link
      to="/case/$id"
      params={{ id: String(Number(item.id)) }}
      className="archive-row docket-row"
    >
      <div className="row-index">
        CASE #{item.id}
        <ArrowUpRight size={15} />
      </div>
      <div className="row-primary">
        <strong>{item.title}</strong>
        <span>
          {item.claim} <span className="row-separator">·</span> Agreement #{item.agreementId}
        </span>
      </div>
      <div className="row-status">
        <StatusLabel status={item.status} />
      </div>
      <div className="row-date">
        <span>FILED {item.filed}</span>
        <span>
          {item.judgment ? "JUDGMENT ENTERED" : `EVIDENCE ${item.evidenceDeadline.split(" · ")[0]}`}
          <span className="row-separator"> · </span>
          READY {Number(item.plaintiffReady) + Number(item.defendantReady)}/2
        </span>
      </div>
    </Link>
  );
}
export function AgreementRow({ item }: { item: Agreement }) {
  return (
    <Link
      to="/agreement/$id"
      params={{ id: String(Number(item.id)) }}
      className="archive-row agreement-row"
    >
      <div className="row-index">
        AGREEMENT #{item.id}
        <ArrowUpRight size={15} />
      </div>
      <div className="row-primary">
        <strong>{item.title}</strong>
        <span>
          {item.client} <span className="row-separator">→</span> {item.provider}
        </span>
      </div>
      <div className="row-status">
        <StatusLabel status={item.status} />
      </div>
      <div className="row-date">
        <span>
          {item.escrow} · {item.accepted ? "ACCEPTED" : "AWAITING ACCEPTANCE"}
        </span>
        <span>
          {item.caseId ? `CASE #${item.caseId} · ` : ""}
          {item.date}
        </span>
      </div>
    </Link>
  );
}
export function EvidenceItem({ item }: { item: Evidence }) {
  return (
    <article className="evidence-item">
      <div className="evidence-number">
        {item.id}
        <span className="cross-mark">+</span>
      </div>
      <div>
        <div className="evidence-meta">
          <span>{item.type}</span>
          <span>
            {item.side} / {item.at}
          </span>
        </div>
        <p>{item.description}</p>
        <div className="reference">
          <span>COMMITTED HTTPS URL</span>
          <code>{item.reference}</code>
          <ArrowUpRight size={14} />
        </div>
        <div className="reference">
          <span>SHA-256 COMMITMENT</span>
          <code>{item.sha256}</code>
        </div>
      </div>
    </article>
  );
}
export function Timeline({
  events,
}: {
  events: { label: string; date: string; detail: string }[];
}) {
  return (
    <ol className="timeline">
      {events.map((event, i) => (
        <li key={`${event.label}-${i}`}>
          <span className="timeline-point" />
          <div>
            <span className="eyebrow muted-text">{event.date}</span>
            <h3>{event.label}</h3>
            <p>{event.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
export function ActionPanel({
  title = "Procedural actions",
  actions,
  onAction,
}: {
  title?: string;
  actions: {
    label: string;
    state: "available" | "disabled" | "pending" | "complete";
    stateLabel?: string | undefined;
    note: string;
  }[];
  onAction?: (label: string) => void;
}) {
  return (
    <section className="action-panel">
      <div className="action-panel-head">
        <span className="eyebrow">COURT OPERATIONS</span>
        <h2>{title}</h2>
        <p>Actions are available only when the connected wallet and contract state permit them.</p>
      </div>
      <div className="action-list">
        {actions.map((action, i) => (
          <div className="action-line" key={action.label}>
            <div className="action-description">
              <span className="eyebrow muted-text">0{i + 1}</span>
              <div>
                <strong>{action.label}</strong>
                <small>{action.note}</small>
              </div>
            </div>
            {action.state === "available" ? (
              <Button size="sm" onClick={() => onAction?.(action.label)}>
                {action.label}
                <ArrowUpRight size={13} />
              </Button>
            ) : (
              <span className={`action-state action-${action.state}`}>
                {action.state === "complete" ? (
                  <Check size={14} />
                ) : action.state === "pending" ? (
                  <Clock3 size={14} />
                ) : (
                  <Minus size={14} />
                )}
                {action.stateLabel ?? action.state}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
export function PageIntro({
  index,
  label,
  title,
  description,
  action,
}: {
  index: string;
  label: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-intro">
      <div className="page-intro-top">
        <Eyebrow>
          {index} / {label}
        </Eyebrow>
        <Eyebrow>GAVEL — PUBLIC RECORD</Eyebrow>
      </div>
      <div className="page-intro-main">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </div>
    </header>
  );
}
export function ArrowLink({
  to,
  children,
}: {
  to: "/cases" | "/agreements" | "/agents" | "/how-it-works" | "/agreements/new" | "/register";
  children: React.ReactNode;
}) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowUpRight size={16} />
    </Link>
  );
}
