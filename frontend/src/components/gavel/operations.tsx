import { useMemo, useState, type ReactNode } from "react";
import { ActionPanel } from "./records";
import { Button } from "@/components/ui/button";
import { GavelTransactionModal } from "@/components/genlayer/transaction-panel";
import { useAgentRecord, useGavelConfig, useInvalidateGavel } from "@/hooks/use-gavel";
import { useWallet } from "@/components/genlayer/wallet-provider";
import { isGavelTransactionSuccessful } from "@/lib/genlayer/transaction-status";
import {
  adjudicateCase,
  acceptAgreement,
  cancelAgreement,
  completeAgreement,
  executeJudgment,
  fileCase,
  markReadyForJudgment,
  submitDefence,
  submitEvidence,
} from "@/lib/genlayer/transactions";
import type { TrackedStatus } from "@genlayer/transaction-kit";
import type { Agreement, CourtCase } from "@/lib/genlayer/types";

const CLAIM_TYPES = [
  "NON_DELIVERY",
  "LATE_DELIVERY",
  "INCOMPLETE_DELIVERY",
  "QUALITY_FAILURE",
  "PAYMENT_DISPUTE",
  "SLA_BREACH",
  "TERMS_VIOLATION",
  "OTHER_CONTRACT_BREACH",
] as const;

const EVIDENCE_TYPES = ["DOCUMENT", "MESSAGE", "RECEIPT", "LOG", "STATEMENT", "OTHER"] as const;

const CLAIM_LABELS: Record<string, string> = {
  NON_DELIVERY: "Non-delivery",
  LATE_DELIVERY: "Late delivery",
  INCOMPLETE_DELIVERY: "Incomplete delivery",
  QUALITY_FAILURE: "Quality failure",
  PAYMENT_DISPUTE: "Payment dispute",
  SLA_BREACH: "SLA breach",
  TERMS_VIOLATION: "Terms violation",
  OTHER_CONTRACT_BREACH: "Other contract breach",
};

const EVIDENCE_LABELS: Record<string, string> = {
  DOCUMENT: "Document",
  MESSAGE: "Message",
  RECEIPT: "Receipt",
  LOG: "Log",
  STATEMENT: "Statement",
  OTHER: "Other",
};

function OperationForm({ children }: { children: ReactNode }) {
  return <div className="operation-form">{children}</div>;
}

function OperationTextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="operation-field">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
      />
    </label>
  );
}

function OperationSelect({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  labels: Record<string, string>;
}) {
  return (
    <label className="operation-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option value={option} key={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function sameAddress(address: string | null, other: string) {
  return Boolean(address && address.toLowerCase() === other.toLowerCase());
}

export function AgreementOperations({ item }: { item: Agreement }) {
  const { address } = useWallet();
  const invalidate = useInvalidateGavel();
  const [selected, setSelected] = useState<string | null>(null);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [claimType, setClaimType] = useState<string>(CLAIM_TYPES[0]);
  const [claim, setClaim] = useState("");
  const [formError, setFormError] = useState("");
  const pending = item.status === "PENDING_ACCEPTANCE";
  const active = item.status === "ACTIVE";
  const allowedAccept = pending && sameAddress(address, item.providerAddress);
  const allowedCancel = pending && sameAddress(address, item.clientAddress);
  const allowedComplete = active && sameAddress(address, item.clientAddress);
  const allowedFile =
    active &&
    (sameAddress(address, item.clientAddress) || sameAddress(address, item.providerAddress));

  const finish = (status: TrackedStatus) => {
    if (!isGavelTransactionSuccessful(status)) return;
    const suffixes = [["agreement", Number(item.id)], ["agreements-page"], ["cases-page"]] as const;
    void invalidate(suffixes);
  };

  const tx = useMemo(() => {
    if (selected === "Accept Agreement") return acceptAgreement(Number(item.id));
    if (selected === "Cancel Agreement") return cancelAgreement(Number(item.id));
    if (selected === "Complete Agreement") return completeAgreement(Number(item.id));
    return fileCase(Number(item.id), claimType, claim.trim());
  }, [claim, claimType, item.id, selected]);

  const closeTransaction = () => {
    setTransactionOpen(false);
    setSelected(null);
    setFormError("");
  };

  const selectAction = (action: string) => {
    setSelected(action);
    setFormError("");
    setTransactionOpen(action !== "File Dispute");
  };

  return (
    <>
      <ActionPanel
        title="Actions on this agreement"
        actions={[
          {
            label: "Accept Agreement",
            state: item.accepted ? "complete" : allowedAccept ? "available" : "disabled",
            note: "Only the recorded provider may accept a pending agreement.",
          },
          {
            label: "Cancel Agreement",
            state:
              item.status === "CANCELLED" ? "complete" : allowedCancel ? "available" : "disabled",
            note: "Only the client may cancel before provider acceptance.",
          },
          {
            label: "Approve Completion",
            state:
              item.status === "COMPLETED" ? "complete" : allowedComplete ? "available" : "disabled",
            note: "Only the client may approve completion while active.",
          },
          {
            label: "File Dispute",
            state: item.caseId ? "complete" : allowedFile ? "available" : "disabled",
            note: "Either party may open one dispute while the agreement is active.",
          },
        ]}
        onAction={selectAction}
      />
      {selected === "File Dispute" && (
        <OperationForm>
          <OperationSelect
            label="ISSUE TYPE"
            value={claimType}
            onChange={setClaimType}
            options={CLAIM_TYPES}
            labels={CLAIM_LABELS}
          />
          <OperationTextArea
            label="WHAT HAPPENED?"
            value={claim}
            onChange={setClaim}
            placeholder="Describe the issue with the agreement."
          />
          <p className="form-footnote">
            GAVEL V1 uses full-escrow settlement according to the judgment.
          </p>
          <Button type="button" disabled={!claim.trim()} onClick={() => setTransactionOpen(true)}>
            REVIEW DISPUTE
          </Button>
          {formError && <p className="field-error">{formError}</p>}
          {transactionOpen && claim.trim() && (
            <GavelTransactionModal
              open
              onClose={closeTransaction}
              title="Review dispute filing"
              description="Confirm fees and sign to place this dispute into the court record."
              tx={tx}
              onDone={finish}
              successMessage="Dispute filed successfully."
            />
          )}
        </OperationForm>
      )}
      {selected && selected !== "File Dispute" && (
        <GavelTransactionModal
          open={transactionOpen}
          onClose={closeTransaction}
          title="Review court action"
          description="Confirm fees and sign to enter this action into the court record."
          tx={tx}
          onDone={finish}
          successMessage="Court action completed successfully."
        />
      )}
    </>
  );
}

export function CaseOperations({ item }: { item: CourtCase }) {
  const { address } = useWallet();
  const invalidate = useInvalidateGavel();
  const config = useGavelConfig();
  const [selected, setSelected] = useState<string | null>(null);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [defence, setDefence] = useState("");
  const [evidenceType, setEvidenceType] = useState<string>(EVIDENCE_TYPES[0]);
  const [content, setContent] = useState("");
  const [uri, setUri] = useState("");
  const maxEvidence = config.data?.max_evidence_per_side ?? 8;
  const agent = useAgentRecord(address ?? "");
  const registeredAgent = agent.record?.isRegistered === true;
  const now = Math.floor(Date.now() / 1000);
  const caseOpen = item.status === "DEFENCE_OPEN" || item.status === "EVIDENCE_OPEN";
  const bothReady = item.plaintiffReady && item.defendantReady;
  const defenceAllowed =
    caseOpen &&
    !bothReady &&
    sameAddress(address, item.defendantAddress) &&
    !item.hasDefence &&
    now < item.responseDeadlineAt;
  const evidenceSide = sameAddress(address, item.plaintiffAddress)
    ? "PLAINTIFF"
    : sameAddress(address, item.defendantAddress)
      ? "DEFENDANT"
      : null;
  const currentSideReady =
    evidenceSide === "PLAINTIFF"
      ? item.plaintiffReady
      : evidenceSide === "DEFENDANT"
        ? item.defendantReady
        : false;
  const transactionActive = transactionOpen;
  const evidenceCount =
    evidenceSide === "PLAINTIFF" ? item.plaintiffEvidenceCount : item.defendantEvidenceCount;
  const evidenceAllowed =
    caseOpen &&
    !bothReady &&
    Boolean(evidenceSide) &&
    now < item.evidenceDeadlineAt &&
    evidenceCount < maxEvidence;
  const judgmentAllowed =
    caseOpen &&
    registeredAgent &&
    !transactionActive &&
    (bothReady || now >= item.evidenceDeadlineAt);
  const markReadyAllowed =
    caseOpen && registeredAgent && Boolean(evidenceSide) && !currentSideReady && !transactionActive;
  const executeAllowed = item.status === "JUDGED" && registeredAgent && !transactionActive;

  const finish = (status: TrackedStatus) => {
    if (!isGavelTransactionSuccessful(status)) return;
    const suffixes: (readonly unknown[])[] = [["case-detail", Number(item.id)], ["cases-page"]];
    if (selected === "Execute Judgment") {
      suffixes.push(
        ["agreement", Number(item.agreementId)],
        ["agreements-page"],
        ["agent", item.plaintiffAddress.toLowerCase()],
        ["agent", item.defendantAddress.toLowerCase()],
      );
    }
    void invalidate(suffixes);
  };

  const tx = useMemo(() => {
    if (selected === "Submit Defence") return submitDefence(Number(item.id), defence.trim());
    if (selected === "Submit Evidence") {
      return submitEvidence(Number(item.id), evidenceType, content.trim(), uri.trim() || "");
    }
    if (selected === "Mark Ready") return markReadyForJudgment(Number(item.id));
    if (selected === "Request Judgment") return adjudicateCase(Number(item.id));
    return executeJudgment(Number(item.id));
  }, [content, defence, evidenceType, item.id, selected, uri]);

  const closeTransaction = () => {
    setTransactionOpen(false);
    setSelected(null);
  };

  const selectAction = (action: string) => {
    setSelected(action);
    setTransactionOpen(!["Submit Defence", "Submit Evidence"].includes(action));
  };

  const countdown = (deadline: number) => {
    const seconds = Math.max(0, deadline - now);
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3_600);
    const minutes = Math.floor((seconds % 3_600) / 60);
    return `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  };

  return (
    <>
      <ActionPanel
        title="Actions on this case"
        actions={[
          {
            label: "Submit Defence",
            state: item.hasDefence
              ? "complete"
              : defenceAllowed
                ? "available"
                : caseOpen
                  ? "disabled"
                  : "pending",
            note: "Only the defendant may submit one non-empty defence before the response deadline.",
          },
          {
            label: "Submit Evidence",
            state:
              item.status === "JUDGED" || item.status === "EXECUTED"
                ? "complete"
                : evidenceAllowed
                  ? "available"
                  : "disabled",
            note: `${evidenceCount} of ${maxEvidence} submitted on your party side.`,
          },
          {
            label: "Mark Ready",
            state: currentSideReady
              ? "complete"
              : markReadyAllowed
                ? "available"
                : caseOpen
                  ? "disabled"
                  : "pending",
            stateLabel: currentSideReady ? "YOU ARE READY" : undefined,
            note: bothReady
              ? "Both parties are ready. The case record is closed."
              : "Mark ready when you are satisfied with the current case record. New defence or evidence resets both confirmations.",
          },
          {
            label: "Request Judgment",
            state:
              item.status === "JUDGED" || item.status === "EXECUTED"
                ? "complete"
                : judgmentAllowed
                  ? "available"
                  : "disabled",
            note: bothReady
              ? "Both parties are ready. Any registered agent may request judgment now."
              : now < item.evidenceDeadlineAt
                ? "Judgment becomes available when both parties are ready or the fallback evidence deadline is reached."
                : "Any registered agent may request judgment.",
          },
          {
            label: "Execute Judgment",
            state:
              item.status === "EXECUTED" ? "complete" : executeAllowed ? "available" : "disabled",
            note: "Any registered agent may execute the deterministic full-escrow settlement.",
          },
        ]}
        onAction={selectAction}
      />
      {selected === "Submit Defence" && (
        <OperationForm>
          <OperationTextArea
            label="DEFENCE"
            value={defence}
            onChange={setDefence}
            placeholder="State the defendant response."
          />
          <p className="form-footnote">
            RESPONSE DEADLINE: {item.responseDeadline} ·{" "}
            {now < item.responseDeadlineAt
              ? `${countdown(item.responseDeadlineAt)} remaining`
              : "window closed"}
          </p>
          <Button type="button" disabled={!defence.trim()} onClick={() => setTransactionOpen(true)}>
            REVIEW DEFENCE
          </Button>
          {transactionOpen && defence.trim() && (
            <GavelTransactionModal
              open
              onClose={closeTransaction}
              title="Review defence"
              description="Confirm fees and sign to submit this defence to the court record."
              tx={tx}
              onDone={finish}
              successMessage="Defence submitted successfully."
            />
          )}
        </OperationForm>
      )}
      {selected === "Submit Evidence" && (
        <OperationForm>
          <OperationSelect
            label="EVIDENCE TYPE"
            value={evidenceType}
            onChange={setEvidenceType}
            options={EVIDENCE_TYPES}
            labels={EVIDENCE_LABELS}
          />
          <OperationTextArea
            label="EVIDENCE DESCRIPTION / CONTENT"
            value={content}
            onChange={setContent}
            placeholder="Material placed on the public record."
          />
          <label className="operation-field">
            <span>REFERENCE URI (OPTIONAL)</span>
            <input
              value={uri}
              onChange={(event) => setUri(event.target.value)}
              placeholder="https://..."
            />
          </label>
          <p className="form-footnote">
            {evidenceCount} of {maxEvidence} submitted · EVIDENCE DEADLINE: {item.evidenceDeadline}
          </p>
          <Button type="button" disabled={!content.trim()} onClick={() => setTransactionOpen(true)}>
            REVIEW EVIDENCE
          </Button>
          {transactionOpen && content.trim() && (
            <GavelTransactionModal
              open
              onClose={closeTransaction}
              title="Review evidence"
              description="Confirm fees and sign to submit this evidence to the court record."
              tx={tx}
              onDone={finish}
              successMessage="Evidence submitted successfully."
            />
          )}
        </OperationForm>
      )}
      {selected === "Request Judgment" && transactionOpen && (
        <GavelTransactionModal
          open
          onClose={closeTransaction}
          title="Request judgment"
          description={
            bothReady
              ? "Both parties have marked the current record ready. Confirm fees and ask a registered agent to enter judgment now."
              : "The fallback evidence deadline has been reached. Confirm fees and ask a registered agent to enter the judgment."
          }
          tx={tx}
          onDone={finish}
          successMessage="Judgment requested successfully."
        />
      )}
      {selected === "Mark Ready" && transactionOpen && (
        <GavelTransactionModal
          open
          onClose={closeTransaction}
          title="Mark ready for judgment"
          description="Confirm that you are satisfied with the current case record. A new defence or evidence submission will reset both parties' readiness confirmations."
          tx={tx}
          onDone={finish}
          successMessage="Your readiness has been recorded."
        />
      )}
      {selected === "Execute Judgment" && transactionOpen && (
        <GavelTransactionModal
          open
          onClose={closeTransaction}
          title="Execute judgment"
          description={`Verdict: ${item.verdict ?? "—"}. ${item.judgment ?? "The recorded judgment will govern settlement."} Escrow: ${item.escrow || "recorded escrow"}. Settlement follows the full-escrow policy.`}
          review={
            <div className="transaction-review-details">
              <div>
                <span>VERDICT</span>
                <strong>{item.verdict ?? "—"}</strong>
              </div>
              <div>
                <span>JUDGMENT SUMMARY</span>
                <strong>{item.judgment ?? "—"}</strong>
              </div>
              <div>
                <span>ESCROW</span>
                <strong>{item.escrow || "Recorded escrow"}</strong>
              </div>
              <div>
                <span>SETTLEMENT POLICY</span>
                <strong>Full Escrow</strong>
              </div>
            </div>
          }
          tx={tx}
          onDone={finish}
          successMessage="Judgment executed successfully."
        />
      )}
    </>
  );
}
