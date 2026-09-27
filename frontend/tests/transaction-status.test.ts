import { describe, expect, test } from "bun:test";
import type { TrackedStatus } from "@genlayer/transaction-kit";
import {
  gavelTransactionFailureMessage,
  gavelTransactionStatusMessage,
  isGavelTransactionSuccessful,
} from "../src/lib/genlayer/transaction-status";

function status(overrides: Partial<TrackedStatus>): TrackedStatus {
  return { phase: "pending", ...overrides };
}

describe("GAVEL decision-success lifecycle", () => {
  test("keeps pending and consensus-processing states active", () => {
    expect(isGavelTransactionSuccessful(status({ phase: "pending" }))).toBe(false);
    expect(isGavelTransactionSuccessful(status({ phase: "processing" }))).toBe(false);
    expect(isGavelTransactionSuccessful(status({ phase: "submitted" }))).toBe(false);
  });

  test("accepts a successful decision immediately", () => {
    const accepted = status({
      phase: "decided",
      statusName: "ACCEPTED",
      executionResultName: "FINISHED_WITH_RETURN",
      successful: true,
    });

    expect(isGavelTransactionSuccessful(accepted)).toBe(true);
    expect(gavelTransactionStatusMessage(accepted)).toBe(
      "Consensus accepted · execution successful.",
    );
  });

  test("rejects an accepted decision with failed execution", () => {
    const acceptedFailure = status({
      phase: "decided",
      statusName: "ACCEPTED",
      executionResultName: "FINISHED_WITH_ERROR",
      successful: false,
    });

    expect(isGavelTransactionSuccessful(acceptedFailure)).toBe(false);
    expect(gavelTransactionFailureMessage(acceptedFailure)).toBe(
      "The transaction was accepted by consensus, but contract execution failed.",
    );
  });

  test("accepts finalized success and rejects finalized execution failure", () => {
    const finalized = status({
      phase: "finalized",
      statusName: "FINALIZED",
      executionResultName: "FINISHED_WITH_RETURN",
      successful: true,
    });
    const finalizedFailure = status({
      phase: "finalized",
      statusName: "FINALIZED",
      executionResultName: "FINISHED_WITH_ERROR",
      successful: false,
    });

    expect(isGavelTransactionSuccessful(finalized)).toBe(true);
    expect(isGavelTransactionSuccessful(finalizedFailure)).toBe(false);
    expect(gavelTransactionStatusMessage(finalized)).toBe("Transaction finalized.");
    expect(gavelTransactionFailureMessage(finalizedFailure)).toBe(
      "The transaction was finalized, but the contract rejected the action.",
    );
  });
});
