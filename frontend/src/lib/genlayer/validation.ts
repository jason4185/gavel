export const GAVEL_MAX_NAME_LENGTH = 64;

export function isValidGavelDisplayName(value: string): boolean {
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= GAVEL_MAX_NAME_LENGTH;
}
