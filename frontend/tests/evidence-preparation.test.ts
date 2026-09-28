import { afterEach, describe, expect, test } from "bun:test";
import {
  EvidencePreparationError,
  prepareEvidenceFromUrl,
} from "../src/lib/server/evidence-preparation";
import { prepareEvidence } from "../src/lib/genlayer/evidence";

const encoder = new TextEncoder();
const originalFetch = globalThis.fetch;

function digest(bytes: Uint8Array): Promise<string> {
  return crypto.subtle
    .digest("SHA-256", bytes)
    .then((value) =>
      Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join(""),
    );
}

function dnsFetcher(address = "93.184.216.34"): typeof fetch {
  return async (input) => {
    const requestUrl = new URL(String(input));
    const type = requestUrl.searchParams.get("type");
    return Response.json({
      Status: 0,
      Answer: type === "A" ? [{ type: 1, data: address }] : [],
    });
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (reason) {
    expect(reason).toBeInstanceOf(EvidencePreparationError);
    expect((reason as EvidencePreparationError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code} to be thrown.`);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("GAVEL server-side evidence preparation", () => {
  test("hashes the exact fixture bytes and returns lowercase SHA-256", async () => {
    const fixture = new Uint8Array(
      await Bun.file(new URL("./fixtures/evidence.txt", import.meta.url)).arrayBuffer(),
    );
    const prepared = await prepareEvidenceFromUrl("https://example.test/evidence.txt", {
      fetchImpl: async () => new Response(fixture, { status: 200 }),
      dnsFetchImpl: dnsFetcher(),
    });

    expect(prepared.size).toBe(fixture.byteLength);
    expect(prepared.sha256).toBe(await digest(fixture));
    expect(prepared.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  test("allows 2048 bytes and rejects 2049 bytes", async () => {
    const allowed = new Uint8Array(2048).fill(65);
    const oversized = new Uint8Array(2049).fill(65);

    const prepared = await prepareEvidenceFromUrl("https://example.test/allowed", {
      fetchImpl: async () => new Response(allowed, { status: 200 }),
      dnsFetchImpl: dnsFetcher(),
    });
    expect(prepared.size).toBe(2048);

    await expectCode(
      prepareEvidenceFromUrl("https://example.test/oversized", {
        fetchImpl: async () => new Response(oversized, { status: 200 }),
        dnsFetchImpl: dnsFetcher(),
      }),
      "EVIDENCE_TOO_LARGE",
    );
  });

  test("rejects empty responses", async () => {
    await expectCode(
      prepareEvidenceFromUrl("https://example.test/empty", {
        fetchImpl: async () => new Response(new Uint8Array(), { status: 200 }),
        dnsFetchImpl: dnsFetcher(),
      }),
      "EVIDENCE_EMPTY",
    );
  });

  test("rejects non-HTTPS, local, private, and metadata destinations", async () => {
    await expectCode(
      prepareEvidenceFromUrl("http://example.test/evidence", {
        fetchImpl: async () => new Response("unexpected"),
        dnsFetchImpl: dnsFetcher(),
      }),
      "UNSUPPORTED_PROTOCOL",
    );

    for (const url of [
      "https://localhost/evidence",
      "https://127.0.0.1/evidence",
      "https://10.0.0.1/evidence",
      "https://192.168.1.1/evidence",
      "https://[::1]/evidence",
      "https://metadata.google.internal/evidence",
    ]) {
      await expectCode(
        prepareEvidenceFromUrl(url, {
          fetchImpl: async () => new Response("unexpected"),
          dnsFetchImpl: dnsFetcher(),
        }),
        url.includes("metadata") || url.includes("localhost") ? "BLOCKED_HOST" : "PRIVATE_ADDRESS",
      );
    }
  });

  test("rejects DNS results that resolve to private addresses", async () => {
    await expectCode(
      prepareEvidenceFromUrl("https://public.test/evidence", {
        fetchImpl: async () => new Response("unexpected"),
        dnsFetchImpl: dnsFetcher("192.168.1.20"),
      }),
      "PRIVATE_ADDRESS",
    );
  });

  test("validates redirect destinations before following them", async () => {
    await expectCode(
      prepareEvidenceFromUrl("https://public.test/evidence", {
        fetchImpl: async (input) =>
          String(input).includes("public.test")
            ? new Response(null, {
                status: 302,
                headers: { location: "https://127.0.0.1/private" },
              })
            : new Response("unexpected", { status: 200 }),
        dnsFetchImpl: dnsFetcher(),
      }),
      "PRIVATE_ADDRESS",
    );
  });

  test("preserves Unicode and newline bytes before hashing", async () => {
    const bytes = encoder.encode("GAVEL ✓\r\nline two\n");
    const prepared = await prepareEvidenceFromUrl("https://example.test/unicode", {
      fetchImpl: async () => new Response(bytes, { status: 200 }),
      dnsFetchImpl: dnsFetcher(),
    });
    expect(prepared.sha256).toBe(await digest(bytes));
  });

  test("uses the same-origin preparation endpoint and sends no manual SHA field", async () => {
    const bytes = encoder.encode("prepared");
    const sha256 = await digest(bytes);
    let requestBody: unknown;
    globalThis.fetch = async (input, init) => {
      expect(String(input)).toBe("/api/prepare-evidence");
      requestBody = JSON.parse(String(init?.body));
      return Response.json({ url: "https://example.test/evidence", sha256, size: bytes.length });
    };

    await expect(prepareEvidence("https://example.test/evidence")).resolves.toEqual({
      url: "https://example.test/evidence",
      sha256,
      size: bytes.length,
    });
    expect(requestBody).toEqual({ url: "https://example.test/evidence" });
  });

  test("maps server preparation failures to friendly UI errors", async () => {
    globalThis.fetch = async () => Response.json({ code: "EVIDENCE_TOO_LARGE" }, { status: 413 });

    await expect(prepareEvidence("https://example.test/evidence")).rejects.toThrow(
      "Evidence must be 2 KB or smaller.",
    );
  });
});
