const GEN_DECIMALS = 18;
const GEN_BASE = 10n ** BigInt(GEN_DECIMALS);

export function parseGen(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid non-negative GEN amount");
  }

  const parts = normalized.split(".");
  const whole = parts[0] ?? "0";
  const fraction = parts[1] ?? "";
  if (fraction.length > GEN_DECIMALS) {
    throw new Error("GEN amounts support at most 18 decimal places");
  }

  return BigInt(whole) * GEN_BASE + BigInt(fraction.padEnd(GEN_DECIMALS, "0"));
}

export function formatGen(value: string | bigint): string {
  const wei = typeof value === "bigint" ? value : BigInt(value);
  const whole = wei / GEN_BASE;
  const fraction = (wei % GEN_BASE).toString().padStart(GEN_DECIMALS, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction} GEN` : `${whole} GEN`;
}

export function formatAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatTimestamp(timestamp: number): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp * 1000));
}

export function formatDeadline(timestamp: number): string {
  if (!timestamp) return "—";
  const date = new Date(timestamp * 1000);
  const datePart = formatTimestamp(timestamp);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
  return `${datePart} · ${timePart} UTC`;
}

export function displayAgreementStatus(status: string): string {
  return formatProtocolLabel(status);
}

export function displayCaseStatus(status: string): string {
  return (
    {
      DEFENCE_OPEN: "Awaiting defence",
      EVIDENCE_OPEN: "Evidence period",
      JUDGED: "Judgment issued",
      EXECUTED: "Judgment executed",
    }[status] ?? formatProtocolLabel(status)
  );
}

export function formatProtocolLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
