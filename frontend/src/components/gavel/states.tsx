import { Button } from "@/components/ui/button";
import { getUserFacingError } from "@/lib/genlayer/errors";

export function ProtocolLoading({ label = "READING COURT RECORD" }: { label?: string }) {
  return (
    <div className="protocol-state protocol-loading" role="status" aria-live="polite">
      <span className="protocol-state-mark" />
      <span>{label}</span>
    </div>
  );
}

export function ProtocolError({
  error,
  onRetry,
  message,
  compact = false,
}: {
  error?: unknown;
  onRetry?: (() => void) | undefined;
  message?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`protocol-state protocol-error ${compact ? "protocol-error-compact" : ""}`}
      role="alert"
    >
      <span className="eyebrow">RECORD UNAVAILABLE</span>
      <p>{message ?? getUserFacingError(error)}</p>
      {onRetry && <Button onClick={onRetry}>TRY AGAIN</Button>}
    </div>
  );
}

export function ProtocolMissing({
  message = "This record could not be found.",
}: {
  message?: string;
}) {
  return (
    <div className="protocol-state protocol-empty">
      <span className="eyebrow">NO MATCHING RECORD</span>
      <p>{message}</p>
    </div>
  );
}
