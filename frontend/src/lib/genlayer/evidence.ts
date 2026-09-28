export const MAX_EVIDENCE_BYTES = 2_048;
export const MAX_EVIDENCE_URL_LENGTH = 2_048;

export type PreparedEvidence = {
  url: string;
  sha256: string;
  size: number;
};

type EvidenceErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "BLOCKED_HOST"
  | "PRIVATE_ADDRESS"
  | "DNS_FAILED"
  | "EVIDENCE_TIMEOUT"
  | "EVIDENCE_UNREACHABLE"
  | "EVIDENCE_REDIRECT"
  | "EVIDENCE_HTTP_ERROR"
  | "EVIDENCE_TOO_LARGE"
  | "EVIDENCE_EMPTY"
  | "INVALID_CONTENT"
  | "EVIDENCE_INTERNAL";

export function validateEvidenceUrl(rawUrl: string): string {
  const url = rawUrl.trim();
  if (url.length === 0 || url.length > MAX_EVIDENCE_URL_LENGTH) {
    throw new Error("Enter a valid public HTTPS evidence URL.");
  }
  if (/\s|\\|#/.test(url) || url.includes("@")) {
    throw new Error("Enter a valid public HTTPS evidence URL.");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Enter a valid public HTTPS evidence URL.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || !parsed.hostname) {
    throw new Error("Enter a valid public HTTPS evidence URL.");
  }
  return url;
}

export async function prepareEvidence(rawUrl: string): Promise<PreparedEvidence> {
  const url = validateEvidenceUrl(rawUrl);
  let response: Response;
  try {
    response = await fetch("/api/prepare-evidence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new Error("GAVEL evidence preparation is unavailable right now. Try again.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("GAVEL evidence preparation returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(preparationErrorMessage(payload));
  }
  if (!isPreparedEvidence(payload)) {
    throw new Error("GAVEL evidence preparation returned incomplete data.");
  }
  return payload;
}

function isPreparedEvidence(value: unknown): value is PreparedEvidence {
  return (
    typeof value === "object" &&
    value !== null &&
    "url" in value &&
    typeof value.url === "string" &&
    value.url.startsWith("https://") &&
    "sha256" in value &&
    typeof value.sha256 === "string" &&
    /^[a-f0-9]{64}$/.test(value.sha256) &&
    "size" in value &&
    typeof value.size === "number" &&
    Number.isInteger(value.size) &&
    value.size > 0 &&
    value.size <= MAX_EVIDENCE_BYTES
  );
}

function preparationErrorMessage(payload: unknown): string {
  const code =
    typeof payload === "object" &&
    payload !== null &&
    "code" in payload &&
    typeof payload.code === "string"
      ? (payload.code as EvidenceErrorCode)
      : undefined;

  switch (code) {
    case "INVALID_REQUEST":
    case "INVALID_URL":
    case "UNSUPPORTED_PROTOCOL":
      return "Enter a valid public HTTPS evidence URL.";
    case "BLOCKED_HOST":
    case "PRIVATE_ADDRESS":
      return "This evidence URL cannot be fetched for security reasons.";
    case "EVIDENCE_TOO_LARGE":
      return "Evidence must be 2 KB or smaller.";
    case "EVIDENCE_EMPTY":
      return "The evidence URL returned an empty response.";
    case "INVALID_CONTENT":
      return "GAVEL could not prepare this evidence URL.";
    case "EVIDENCE_TIMEOUT":
      return "The evidence host took too long to respond.";
    case "EVIDENCE_REDIRECT":
      return "This evidence URL could not be followed safely.";
    case "DNS_FAILED":
    case "EVIDENCE_UNREACHABLE":
    case "EVIDENCE_HTTP_ERROR":
    case "EVIDENCE_INTERNAL":
    default:
      return "GAVEL could not fetch this evidence URL.";
  }
}
