import { createClient } from "genlayer-js";
import { CalldataAddress } from "genlayer-js/types";
import type { Address, CalldataEncodable, GenLayerClient } from "genlayer-js/types";
import { GAVEL_CHAIN, GAVEL_CONTRACT_ADDRESS, GAVEL_NETWORK_PARAMS } from "./config";
import { normalizeReadError } from "./errors";

export type GavelClient = GenLayerClient<typeof GAVEL_CHAIN>;

export function createGavelClient(account?: string): GavelClient {
  return createClient({
    chain: GAVEL_CHAIN as unknown as NonNullable<
      NonNullable<Parameters<typeof createClient>[0]>["chain"]
    >,
    ...(account ? { account: account as Address } : {}),
  });
}

let publicClient: GavelClient | undefined;

export function getPublicGavelClient(): GavelClient {
  publicClient ??= createGavelClient();
  return publicClient;
}

export function toCalldataAddress(value: string): CalldataAddress {
  const normalized = value.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) {
    throw new Error(`Invalid EVM address: ${value}`);
  }

  const bytes = new Uint8Array(20);
  for (let index = 0; index < 20; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(2 + index * 2, 4 + index * 2), 16);
  }
  return new CalldataAddress(bytes);
}

export function contractRead<T>(
  functionName: string,
  args: CalldataEncodable[] = [],
  account?: string,
): Promise<T> {
  const client = account ? createGavelClient(account) : getPublicGavelClient();
  return client
    .readContract({
      address: GAVEL_CONTRACT_ADDRESS,
      functionName,
      args,
    })
    .then((value) => value as T)
    .catch((error: unknown) => {
      throw normalizeReadError(error, functionName);
    });
}

export { GAVEL_CHAIN, GAVEL_CONTRACT_ADDRESS, GAVEL_NETWORK_PARAMS };
