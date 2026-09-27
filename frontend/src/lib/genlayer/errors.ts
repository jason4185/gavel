export type GavelErrorKind =
  | "rate_limit"
  | "network"
  | "missing"
  | "wallet_rejected"
  | "insufficient_funds"
  | "wrong_network"
  | "permission"
  | "state"
  | "deadline"
  | "duplicate"
  | "not_registered"
  | "evidence_limit"
  | "execution"
  | "contract"
  | "unknown";

export class GavelError extends Error {
  readonly kind: GavelErrorKind;

  constructor(kind: GavelErrorKind, message: string) {
    super(message);
    this.name = "GavelError";
    this.kind = kind;
  }
}

function rawText(error: unknown): string {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error) ?? "";
  } catch {
    return "";
  }
}

export function classifyGavelError(error: unknown): GavelErrorKind {
  if (error instanceof GavelError) return error.kind;
  const text = rawText(error).toLowerCase();
  if (text.includes("429") || text.includes("rate limit") || text.includes("too many requests")) {
    return "rate_limit";
  }
  if (
    text.includes("not found") ||
    text.includes("record does not exist") ||
    text.includes("missing record")
  ) {
    return "missing";
  }
  if (text.includes("user rejected") || text.includes("user denied") || text.includes("4001")) {
    return "wallet_rejected";
  }
  if (
    text.includes("insufficient funds") ||
    text.includes("insufficient balance") ||
    text.includes("not enough gen")
  ) {
    return "insufficient_funds";
  }
  if (text.includes("not registered") || text.includes("register this wallet")) {
    return "not_registered";
  }
  if (text.includes("self agreement is not allowed")) return "contract";
  if (text.includes("agreement is not awaiting acceptance")) return "state";
  if (text.includes("only counterparty may accept")) return "permission";
  if (text.includes("agreement cannot be cancelled")) return "state";
  if (text.includes("only creator may cancel")) return "permission";
  if (text.includes("agreement is not active")) return "state";
  if (text.includes("only client may approve completion")) return "permission";
  if (text.includes("agreement already has a case")) return "duplicate";
  if (text.includes("invalid claim type")) return "contract";
  if (text.includes("only agreement parties may file")) return "permission";
  if (text.includes("defence already submitted")) return "duplicate";
  if (text.includes("only defendant may submit defence")) return "permission";
  if (text.includes("invalid evidence type")) return "contract";
  if (text.includes("evidence window is open")) return "deadline";
  if (text.includes("only case parties may submit evidence")) return "permission";
  if (text.includes("only case parties may mark ready")) return "permission";
  if (text.includes("party already ready")) return "duplicate";
  if (text.includes("case record is closed")) return "state";
  if (text.includes("waiting for both parties or evidence deadline")) return "deadline";
  if (text.includes("case is not awaiting execution")) return "state";
  if (
    text.includes("wrong network") ||
    text.includes("switch your wallet") ||
    text.includes("4901")
  ) {
    return "wrong_network";
  }
  if (text.includes("maximum") && text.includes("evidence")) return "evidence_limit";
  if (text.includes("deadline") || text.includes("window has closed")) return "deadline";
  if (text.includes("already registered") || text.includes("already completed")) return "duplicate";
  if (
    text.includes("unauthorized") ||
    text.includes("not authorized") ||
    text.includes("only the")
  ) {
    return "permission";
  }
  if (
    text.includes("wrong state") ||
    text.includes("invalid state") ||
    text.includes("cannot be changed")
  ) {
    return "state";
  }
  if (
    text.includes("network") ||
    text.includes("failed to fetch") ||
    text.includes("fetch failed") ||
    text.includes("econn") ||
    text.includes("timeout")
  ) {
    return "network";
  }
  if (text.includes("execution") && text.includes("error")) return "execution";
  return "unknown";
}

export function isRateLimitError(error: unknown): boolean {
  return classifyGavelError(error) === "rate_limit";
}

export function gavelRetryDelay(attemptIndex: number): number {
  const base = Math.min(8_000, 2_000 * 2 ** attemptIndex);
  return base + Math.floor(Math.random() * 350);
}

export function shouldRetryGavelRead(failureCount: number): boolean {
  return failureCount < 2;
}

function specificContractMessage(error: unknown): string | undefined {
  const text = rawText(error).toLowerCase();
  if (text.includes("agent already registered")) {
    return "This wallet is already registered as a GAVEL agent.";
  }
  if (text.includes("agent is not registered")) {
    return "Register this wallet as an agent before continuing.";
  }
  if (text.includes("self agreement is not allowed")) {
    return "You cannot create an agreement with your own wallet.";
  }
  if (text.includes("agreement not found") || text.includes("case not found")) {
    return "This record could not be found.";
  }
  if (text.includes("agreement is not awaiting acceptance")) {
    return "This agreement is no longer awaiting acceptance.";
  }
  if (text.includes("only counterparty may accept")) {
    return "Only the provider can accept this agreement.";
  }
  if (text.includes("agreement cannot be cancelled")) {
    return "This agreement cannot be cancelled in its current state.";
  }
  if (text.includes("only creator may cancel")) {
    return "Only the client can cancel this agreement.";
  }
  if (text.includes("agreement is not active")) {
    return "This agreement is not active.";
  }
  if (text.includes("only client may approve completion")) {
    return "Only the client can approve completion.";
  }
  if (text.includes("agreement already has a case")) {
    return "This agreement already has a dispute.";
  }
  if (text.includes("invalid claim type")) {
    return "Choose a valid issue type before filing.";
  }
  if (text.includes("only agreement parties may file")) {
    return "Only the client or provider can file a dispute.";
  }
  if (text.includes("defence already submitted")) {
    return "A defence has already been submitted.";
  }
  if (text.includes("only defendant may submit defence")) {
    return "Only the defendant can submit a defence.";
  }
  if (text.includes("response deadline passed")) {
    return "The defence response window has closed.";
  }
  if (text.includes("invalid evidence type")) {
    return "Choose a valid evidence type before submitting.";
  }
  if (text.includes("evidence deadline passed")) {
    return "The evidence submission window has closed.";
  }
  if (text.includes("evidence window is open")) {
    return "The evidence period is still open.";
  }
  if (text.includes("only case parties may submit evidence")) {
    return "Only the plaintiff or defendant can submit evidence.";
  }
  if (text.includes("only case parties may mark ready")) {
    return "Only the plaintiff or defendant can mark this case ready.";
  }
  if (text.includes("party already ready")) {
    return "You have already marked this case ready.";
  }
  if (text.includes("case record is closed")) {
    return "Both parties are ready, so the case record is closed.";
  }
  if (text.includes("waiting for both parties or evidence deadline")) {
    return "Judgment becomes available when both parties are ready or the evidence deadline is reached.";
  }
  if (text.includes("case is not awaiting execution")) {
    return "This case is not ready for judgment execution.";
  }
  return undefined;
}

export function userMessageForError(error: unknown, context: "read" | "wallet" | "write" = "read") {
  const specific = specificContractMessage(error);
  if (specific) return specific;

  switch (classifyGavelError(error)) {
    case "rate_limit":
      return "GAVEL is receiving too many requests right now. Please wait a moment and try again.";
    case "network":
      return "GAVEL could not reach the court records right now. Check your connection and try again.";
    case "missing":
      return "This record could not be found.";
    case "wallet_rejected":
      return "You cancelled the wallet request.";
    case "insufficient_funds":
      return "Your wallet does not have enough GEN for this transaction.";
    case "wrong_network":
      return "Switch your wallet to Studio Next to continue.";
    case "permission":
      return "This action is not available to the connected wallet.";
    case "state":
      return "This record can’t be changed in its current state.";
    case "deadline":
      return "This procedural window has closed.";
    case "duplicate":
      return "This action has already been completed.";
    case "not_registered":
      return "Register this wallet as an agent before continuing.";
    case "evidence_limit":
      return "This side has already submitted the maximum number of evidence items.";
    case "execution":
      return "The transaction was finalized, but the contract rejected the action.";
    case "contract":
      return "We couldn’t load this record. Please try again in a moment.";
    default:
      return context === "wallet"
        ? "The wallet could not be connected. Please try again."
        : context === "write"
          ? "The transaction could not be completed. Please try again."
          : "We couldn’t load this record. Please try again in a moment.";
  }
}

export function normalizeReadError(error: unknown, query: string): GavelError {
  if (import.meta.env.DEV) console.error("[GAVEL read]", { query, error });
  const kind = classifyGavelError(error);
  return new GavelError(kind, userMessageForError(error, "read"));
}

export function normalizeWalletError(error: unknown): GavelError {
  if (import.meta.env.DEV) console.error("[GAVEL wallet]", { error });
  const kind = classifyGavelError(error);
  return new GavelError(kind, userMessageForError(error, "wallet"));
}

export function normalizeNetworkSwitchError(
  error: unknown,
  stage: "switch" | "add" | "confirm",
): GavelError {
  if (import.meta.env.DEV) console.error("[GAVEL network switch]", { stage, error });
  const code =
    typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (code === 4001 || code === "4001" || classifyGavelError(error) === "wallet_rejected") {
    return new GavelError("wallet_rejected", "You cancelled the network switch.");
  }
  if (stage === "add") {
    return new GavelError("unknown", "Studio Next could not be added to this wallet.");
  }
  return new GavelError(
    "wrong_network",
    "We couldn't switch your wallet to Studio Next. Please try again.",
  );
}

export function normalizeWriteError(error: unknown): GavelError {
  if (import.meta.env.DEV) console.error("[GAVEL write]", { error });
  const kind = classifyGavelError(error);
  return new GavelError(kind, userMessageForError(error, "write"));
}

export function getUserFacingError(error: unknown, context: "read" | "wallet" | "write" = "read") {
  return error instanceof GavelError ? error.message : userMessageForError(error, context);
}
