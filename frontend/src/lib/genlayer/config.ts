import { studioDevnet } from "genlayer-js/chains";
import type { Address } from "genlayer-js/types";

const deployedContractAddress = "0xa6ACfbD7757512456a237EB516985b4f3ff74638";
const expectedChainId = Number(import.meta.env["VITE_GENLAYER_CHAIN_ID"] || studioDevnet.id);
const expectedRpc =
  import.meta.env["VITE_GENLAYER_RPC_URL"] || studioDevnet.rpcUrls.default.http[0];

if (expectedChainId !== studioDevnet.id) {
  throw new Error(
    `GAVEL requires Studio-dev chain ${studioDevnet.id}; received ${expectedChainId}`,
  );
}

if (expectedRpc !== studioDevnet.rpcUrls.default.http[0]) {
  throw new Error(
    `GAVEL requires the canonical Studio-dev RPC ${studioDevnet.rpcUrls.default.http[0]}`,
  );
}

const configuredContractAddress =
  import.meta.env["VITE_GAVEL_CONTRACT_ADDRESS"] || deployedContractAddress;

if (!/^0x[0-9a-fA-F]{40}$/.test(configuredContractAddress)) {
  throw new Error("VITE_GAVEL_CONTRACT_ADDRESS must be a valid EVM address");
}
if (configuredContractAddress.toLowerCase() !== deployedContractAddress.toLowerCase()) {
  throw new Error(`GAVEL requires deployed contract ${deployedContractAddress}`);
}

export const GAVEL_CONTRACT_ADDRESS = deployedContractAddress as Address;
export const GAVEL_CHAIN = studioDevnet;
export const GAVEL_CHAIN_ID = studioDevnet.id;
export const GAVEL_CHAIN_ID_HEX = `0x${studioDevnet.id.toString(16)}`;
export const GAVEL_RPC_URL = studioDevnet.rpcUrls.default.http[0];
export const GAVEL_EXPLORER_URL = "https://explorer-studio-dev.genlayer.com/";
export const GAVEL_NETWORK_PARAMS = {
  chainId: GAVEL_CHAIN_ID_HEX,
  chainName: "Studio Next",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: [GAVEL_RPC_URL],
  blockExplorerUrls: [GAVEL_EXPLORER_URL],
};
