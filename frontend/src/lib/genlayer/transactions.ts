import type { CalldataEncodable } from "genlayer-js/types";
import type { SubmitInput } from "@genlayer/transaction-kit";
import { GAVEL_CONTRACT_ADDRESS } from "./config";
import { toCalldataAddress } from "./client";

export type GavelWrite = Extract<SubmitInput, { kind: "write" }>;

function write(method: string, args: CalldataEncodable[] = []): GavelWrite {
  return { kind: "write", address: GAVEL_CONTRACT_ADDRESS, method, args };
}

export const registerAgent = (displayName: string) => write("register_agent", [displayName]);

export const createAgreement = (counterparty: string, title: string, terms: string) =>
  write("create_agreement", [toCalldataAddress(counterparty), title, terms]);

export const acceptAgreement = (agreementId: number) =>
  write("accept_agreement", [BigInt(agreementId)]);

export const expireAgreement = (agreementId: number) =>
  write("expire_agreement", [BigInt(agreementId)]);

export const cancelAgreement = (agreementId: number) =>
  write("cancel_agreement", [BigInt(agreementId)]);

export const completeAgreement = (agreementId: number) =>
  write("complete_agreement", [BigInt(agreementId)]);

export const fileCase = (agreementId: number, claimType: string, claim: string) =>
  write("file_case", [BigInt(agreementId), claimType, claim]);

export const submitDefence = (caseId: number, defence: string) =>
  write("submit_defence", [BigInt(caseId), defence]);

export const submitEvidence = (
  caseId: number,
  evidenceType: string,
  description: string,
  evidenceUrl: string,
  evidenceSha256: string,
) =>
  write("submit_evidence", [
    BigInt(caseId),
    evidenceType,
    description,
    evidenceUrl,
    evidenceSha256,
  ]);

export const markReadyForJudgment = (caseId: number) =>
  write("mark_ready_for_judgment", [BigInt(caseId)]);

export const adjudicateCase = (caseId: number) => write("adjudicate_case", [BigInt(caseId)]);

export const executeJudgment = (caseId: number) => write("execute_judgment", [BigInt(caseId)]);
