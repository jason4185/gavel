import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GenLayerTransactionPanel,
  type SubmitInput,
  type TrackedStatus,
} from "@genlayer/transaction-kit-react";
import "@genlayer/transaction-kit-react/styles.css";
import { createTransactionKit, type TransactionKit } from "@genlayer/transaction-kit";
import { GAVEL_CHAIN } from "@/lib/genlayer/config";
import { getUserFacingError, normalizeWriteError } from "@/lib/genlayer/errors";
import {
  gavelTransactionFailureMessage,
  gavelTransactionStatusMessage,
  isGavelTransactionSuccessful,
} from "@/lib/genlayer/transaction-status";
import { Button } from "@/components/ui/button";
import { useWallet, type Eip1193Provider } from "./wallet-provider";

export function useGavelTransactionKit(): TransactionKit | null {
  const { address, isCorrectNetwork, activeProvider } = useWallet();
  return useMemo(() => {
    const injected = activeProvider;
    if (!injected || !address || !isCorrectNetwork) return null;
    const kit = createTransactionKit({
      chain: GAVEL_CHAIN,
      provider: injected as Eip1193Provider,
      account: address as `0x${string}`,
    });
    return {
      ...kit,
      estimate: (input, tx) =>
        kit
          .estimate(input, tx)
          .catch((error: unknown) => Promise.reject(normalizeWriteError(error))),
      submit: (quote, tx) =>
        kit.submit(quote, tx).catch((error: unknown) => Promise.reject(normalizeWriteError(error))),
      track: (id, onUpdate, options) =>
        kit
          .track(id, onUpdate, options)
          .catch((error: unknown) => Promise.reject(normalizeWriteError(error))),
      cancel: (input) =>
        kit.cancel(input).catch((error: unknown) => Promise.reject(normalizeWriteError(error))),
      topUp: (input) =>
        kit.topUp(input).catch((error: unknown) => Promise.reject(normalizeWriteError(error))),
    };
  }, [activeProvider, address, isCorrectNetwork]);
}

export function TransactionPanel({
  tx,
  userValue,
  onDone,
  failureMessage,
  successMessage = "Completed successfully.",
}: {
  tx: SubmitInput;
  userValue?: bigint;
  onDone?: (status: TrackedStatus) => void;
  failureMessage?: string;
  successMessage?: string;
}) {
  const kit = useGavelTransactionKit();
  const { address, isCorrectNetwork, connect, switchNetwork, isLoading } = useWallet();
  const [status, setStatus] = useState<TrackedStatus | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  if (!address) {
    return (
      <div className="transaction-gate">
        <p>Connect a wallet to review fees and sign this court operation.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void connect().catch((error: unknown) =>
              setWalletError(getUserFacingError(error, "wallet")),
            );
          }}
        >
          CONNECT WALLET
        </Button>
        {walletError && <p className="field-error">{walletError}</p>}
      </div>
    );
  }

  if (!isCorrectNetwork || !kit) {
    return (
      <div className="transaction-gate">
        <p>Switch your wallet to Studio Next to continue.</p>
        <Button
          type="button"
          variant="default"
          disabled={isLoading}
          onClick={() =>
            void switchNetwork().catch((error: unknown) =>
              setWalletError(getUserFacingError(error, "wallet")),
            )
          }
        >
          SWITCH TO STUDIO NEXT
        </Button>
        {walletError && <p className="field-error">{walletError}</p>}
      </div>
    );
  }

  return (
    <div className="gavel-transaction-panel">
      <GenLayerTransactionPanel
        kit={kit}
        tx={tx}
        network="Studio Next"
        theme="light"
        trackUntil="decided"
        {...(userValue === undefined ? {} : { userValue })}
        onDone={(nextStatus) => {
          setStatus(nextStatus);
          onDone?.(nextStatus);
        }}
      />
      {status && (
        <div
          className={`transaction-result ${isGavelTransactionSuccessful(status) ? "transaction-success" : "transaction-error"}`}
        >
          <span>
            {isGavelTransactionSuccessful(status)
              ? successMessage
              : gavelTransactionFailureMessage(status, failureMessage)}
          </span>
          <span>{gavelTransactionStatusMessage(status)}</span>
        </div>
      )}
    </div>
  );
}

type GavelTransactionModalProps = {
  open: boolean;
  onClose: () => void;
  tx: SubmitInput;
  userValue?: bigint;
  review?: React.ReactNode;
  onDone?: (status: TrackedStatus) => void;
  title?: string;
  description?: string;
  failureMessage?: string;
  successMessage?: string;
};

/**
 * Keeps the Transaction Kit flow intact while giving it a deliberate GAVEL
 * presentation. The kit remains responsible for quotation, signing, and
 * tracking; this shell only owns placement and safe dismissal.
 */
export function GavelTransactionModal({
  open,
  onClose,
  tx,
  userValue,
  review,
  onDone,
  title = "Review court action",
  description = "Confirm fees and sign to enter this action into the court record.",
  failureMessage,
  successMessage,
}: GavelTransactionModalProps) {
  const [submissionStarted, setSubmissionStarted] = useState(false);
  const [completedStatus, setCompletedStatus] = useState<TrackedStatus | null>(null);
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      setSubmissionStarted(false);
      setCompletedStatus(null);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submissionStarted) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, submissionStarted]);

  useEffect(() => {
    if (!open || !modalRef.current) return;
    const observer = new MutationObserver(() => {
      if (modalRef.current?.querySelector('[data-tone="error"]')) {
        setSubmissionStarted(false);
      }
    });
    observer.observe(modalRef.current, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, [open]);

  if (!open) return null;

  const requestClose = () => {
    if (!submissionStarted) onClose();
  };

  const lockAfterApprovalClick = (event: React.SyntheticEvent<HTMLElement>) => {
    const target = event.target;
    const approvalButton =
      target instanceof Element ? target.closest<HTMLButtonElement>(".gltk-hold") : null;
    if (approvalButton && !approvalButton.disabled) {
      setSubmissionStarted(true);
    }
  };

  const modal = (
    <div
      className="gavel-transaction-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        ref={modalRef}
        className="gavel-transaction-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gavel-transaction-title"
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDownCapture={lockAfterApprovalClick}
        onClickCapture={lockAfterApprovalClick}
      >
        <header className="gavel-transaction-modal-head">
          <div>
            <span className="eyebrow">COURT TRANSACTION</span>
            <h2 id="gavel-transaction-title">{title}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="gavel-transaction-close"
            aria-label={submissionStarted ? "Transaction in progress" : "Close transaction review"}
            disabled={submissionStarted}
            onClick={requestClose}
          >
            ×
          </Button>
        </header>
        <p className="gavel-transaction-description">{description}</p>
        <div className="gavel-transaction-status" data-active={submissionStarted}>
          {submissionStarted
            ? "TRANSACTION IN PROGRESS — KEEP THIS WINDOW OPEN"
            : completedStatus
              ? gavelTransactionStatusMessage(completedStatus)
              : "AWAITING SIGNATURE"}
        </div>
        {review}
        <div className="gavel-transaction-modal-body">
          <TransactionPanel
            tx={tx}
            {...(userValue === undefined ? {} : { userValue })}
            {...(failureMessage === undefined ? {} : { failureMessage })}
            {...(successMessage === undefined ? {} : { successMessage })}
            onDone={(status) => {
              setSubmissionStarted(false);
              setCompletedStatus(status);
              onDone?.(status);
            }}
          />
        </div>
      </section>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(modal, document.body);
}
