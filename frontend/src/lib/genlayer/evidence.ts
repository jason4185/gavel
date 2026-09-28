export const MAX_EVIDENCE_BYTES = 2_048;
export const MAX_EVIDENCE_URL_LENGTH = 2_048;

export type PreparedEvidence = {
  url: string;
  sha256: string;
  size: number;
};

export function validateEvidenceUrl(rawUrl: string): string {
  const url = rawUrl.trim();
  if (!url.startsWith("https://")) {
    throw new Error("Evidence URL must use HTTPS.");
  }
  if (url.length > MAX_EVIDENCE_URL_LENGTH || /[\s\\#]/.test(url) || url.includes("@")) {
    throw new Error("Evidence URL is not valid GAVEL HTTPS URL syntax.");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Evidence URL is not valid GAVEL HTTPS URL syntax.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || !parsed.hostname) {
    throw new Error("Evidence URL is not valid GAVEL HTTPS URL syntax.");
  }
  return url;
}

function toLowerHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function prepareEvidence(rawUrl: string): Promise<PreparedEvidence> {
  const url = validateEvidenceUrl(rawUrl);
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      credentials: "omit",
    });
  } catch {
    throw new Error(
      "Unable to prepare this evidence URL from the browser. Use a direct HTTPS URL that permits browser access.",
    );
  }

  if (!response.ok) {
    throw new Error(`Evidence URL returned HTTP ${response.status}.`);
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await response.arrayBuffer();
  } catch {
    throw new Error(
      "Unable to read this evidence response in the browser. Use a direct HTTPS URL that permits browser access.",
    );
  }

  if (bytes.byteLength === 0) {
    throw new Error("Evidence response is empty.");
  }
  if (bytes.byteLength > MAX_EVIDENCE_BYTES) {
    throw new Error(`Evidence response exceeds the ${MAX_EVIDENCE_BYTES}-byte limit.`);
  }

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = toLowerHex(new Uint8Array(digest));
  return { url, sha256, size: bytes.byteLength };
}
