import type { TrackedStatus } from "@genlayer/transaction-kit";

/**
 * Transaction Kit derives `successful` from GenLayer's official
 * `isSuccessful(...)` helper. A decision is actionable once it is materialized
 * as either `decided` or `finalized`; the execution result is therefore
 * validated by the kit rather than re-encoded in the UI.
 */
export function isGavelTransactionSuccessful(status: TrackedStatus): boolean {
  return (status.phase === "decided" || status.phase === "finalized") && status.successful === true;
}

export function gavelTransactionStatusMessage(status: TrackedStatus): string {
  if (isGavelTransactionSuccessful(status)) {
    return status.phase === "finalized"
      ? "Transaction finalized."
      : "Consensus accepted · execution successful.";
  }

  if (status.phase === "decided" && status.statusName === "ACCEPTED") {
    return "Consensus accepted, but contract execution failed.";
  }

  if (status.phase === "finalized") {
    return "Transaction finalized, but contract execution failed.";
  }

  return "Waiting for GenLayer consensus…";
}

export function gavelTransactionFailureMessage(
  status: TrackedStatus,
  customMessage?: string,
): string {
  if (customMessage) return customMessage;
  if (status.phase === "decided" && status.statusName === "ACCEPTED") {
    return "The transaction was accepted by consensus, but contract execution failed.";
  }
  if (status.phase === "finalized") {
    return "The transaction was finalized, but the contract rejected the action.";
  }
  return "The transaction could not be completed. Please try again.";
}
