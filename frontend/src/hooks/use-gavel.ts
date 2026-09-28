import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useWallet } from "@/components/genlayer/wallet-provider";
import { GAVEL_CONTRACT_ADDRESS } from "@/lib/genlayer/config";
import { formatGen } from "@/lib/genlayer/format";
import {
  getAgent,
  getAgentsPage,
  getAgreement,
  getAgreementsPage,
  getCase,
  getCaseDetail,
  getCasesPage,
  getConfig,
  getMyAgent,
  toAgentRecord,
  toAgreementRecord,
  toCaseRecord,
  toCaseSummaryRecord,
} from "@/lib/genlayer/reads";
import type {
  Agent,
  Agreement,
  CourtCase,
  GavelAgentRaw,
  GavelAgreementRaw,
  GavelCaseDetailRaw,
} from "@/lib/genlayer/types";

export const GAVEL_QUERY_SCOPE = ["gavel", GAVEL_CONTRACT_ADDRESS] as const;
const PAGE_SIZE = 20;

export function gavelQueryKey(...parts: readonly unknown[]) {
  return [...GAVEL_QUERY_SCOPE, ...parts] as const;
}

function flattenPages<T>(pages: { items: T[] }[] | undefined): T[] {
  return pages?.flatMap((page) => page.items) ?? [];
}

function useRawAgentPages() {
  return useInfiniteQuery({
    queryKey: gavelQueryKey("agents-page", PAGE_SIZE),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getAgentsPage(Number(pageParam), PAGE_SIZE),
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
  });
}

function useRawAgreementPages() {
  return useInfiniteQuery({
    queryKey: gavelQueryKey("agreements-page", PAGE_SIZE),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getAgreementsPage(Number(pageParam), PAGE_SIZE),
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
  });
}

function useRawCasePages() {
  return useInfiniteQuery({
    queryKey: gavelQueryKey("cases-page", PAGE_SIZE),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getCasesPage(Number(pageParam), PAGE_SIZE),
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
  });
}

export function useGavelConfig() {
  return useQuery({
    queryKey: gavelQueryKey("config"),
    queryFn: getConfig,
    staleTime: 10 * 60_000,
  });
}

export function useNewestAgreementId() {
  const queryClient = useQueryClient();
  return async () => {
    const page = await queryClient.fetchQuery({
      queryKey: gavelQueryKey("agreements-page", PAGE_SIZE),
      queryFn: () => getAgreementsPage(0, PAGE_SIZE),
    });
    return page.items.length ? Math.max(...page.items.map((item) => Number(item.id))) : undefined;
  };
}

export function useAgentRecords() {
  const query = useRawAgentPages();
  const records = useMemo(() => flattenPages(query.data?.pages).map(toAgentRecord), [query.data]);
  return { ...query, records, failedCount: 0, agentsLoading: false };
}

export function useAgreementRecords() {
  const query = useRawAgreementPages();
  const records = useMemo(
    () => flattenPages(query.data?.pages).map((item) => toAgreementRecord(item)),
    [query.data],
  );
  return { ...query, records, agentsLoading: false, failedCount: 0 };
}

export function useCaseRecords() {
  const query = useRawCasePages();
  const records = useMemo(
    () => flattenPages(query.data?.pages).map((item) => toCaseSummaryRecord(item)),
    [query.data],
  );
  return { ...query, records, agentsLoading: false, failedCount: 0 };
}

export function useAgreementRecord(id: string) {
  const numericId = Number(id);
  const query = useQuery({
    queryKey: gavelQueryKey("agreement", numericId),
    queryFn: () => getAgreement(numericId),
    enabled: Number.isSafeInteger(numericId) && numericId > 0,
  });
  const linkedCase = useQuery({
    queryKey: gavelQueryKey("case", query.data?.case_id),
    queryFn: () => getCase(query.data!.case_id),
    enabled: Boolean(query.data?.case_id),
  });
  const record = query.data ? toAgreementRecord(query.data) : undefined;
  return { ...query, record, linkedCase, agentsLoading: false };
}

export function useCaseRecord(id: string) {
  const numericId = Number(id);
  const query = useQuery<GavelCaseDetailRaw>({
    queryKey: gavelQueryKey("case-detail", numericId),
    queryFn: () => getCaseDetail(numericId),
    enabled: Number.isSafeInteger(numericId) && numericId > 0,
  });
  const detail = query.data;
  const evidence = detail ? [...detail.plaintiff_evidence, ...detail.defendant_evidence] : [];
  const record = detail
    ? toCaseRecord(
        detail.case,
        evidence,
        new Map(),
        formatGen(detail.agreement.escrow),
        detail.agreement,
      )
    : undefined;
  return {
    ...query,
    record,
    evidence: {
      data: evidence,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      refetch: async () => {
        await query.refetch();
      },
    },
    linkedAgreement: {
      data: detail?.agreement,
      isError: false,
      error: null,
      refetch: async () => {
        await query.refetch();
      },
    },
    agentsLoading: false,
  };
}

export function useAgentRecord(address: string) {
  const query = useQuery({
    queryKey: gavelQueryKey("agent", address.toLowerCase()),
    queryFn: () => getAgent(address),
    enabled: /^0x[0-9a-fA-F]{40}$/.test(address),
  });
  return { ...query, record: query.data ? toAgentRecord(query.data) : undefined };
}

export function useMyAgent() {
  const { address } = useWallet();
  return useQuery({
    queryKey: gavelQueryKey("my-agent", address?.toLowerCase()),
    queryFn: () => getMyAgent(address!),
    enabled: Boolean(address),
  });
}

export function useInvalidateGavel() {
  const queryClient = useQueryClient();
  return (suffixes: readonly (readonly unknown[])[] = [[]]) =>
    Promise.all(
      suffixes.map((suffix) =>
        queryClient.invalidateQueries({ queryKey: gavelQueryKey(...suffix) }),
      ),
    );
}

export function useRelatedRecords(address: string) {
  const cases = useCaseRecords();
  const agreements = useAgreementRecords();
  const normalized = address.toLowerCase();
  return {
    cases: cases.records.filter(
      (item) =>
        item.plaintiffAddress.toLowerCase() === normalized ||
        item.defendantAddress.toLowerCase() === normalized,
    ),
    agreements: agreements.records.filter(
      (item) =>
        item.clientAddress.toLowerCase() === normalized ||
        item.providerAddress.toLowerCase() === normalized,
    ),
    isLoading: cases.isLoading || agreements.isLoading,
  };
}

export type GavelRecordQuery = {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export type { Agent, Agreement, CourtCase, GavelAgentRaw, GavelAgreementRaw };
