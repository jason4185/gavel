import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GAVEL_CHAIN_ID, GAVEL_CHAIN_ID_HEX, GAVEL_NETWORK_PARAMS } from "@/lib/genlayer/config";
import {
  GavelError,
  normalizeNetworkSwitchError,
  normalizeWalletError,
} from "@/lib/genlayer/errors";

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  providers?: Eip1193Provider[];
  isMetaMask?: boolean;
  isRabby?: boolean;
};

export type WalletOption = {
  id: string;
  label: string;
  provider: Eip1193Provider;
};

type Eip6963Detail = {
  info?: { uuid?: string; name?: string; rdns?: string };
  provider?: Eip1193Provider;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

type WalletState = {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isLoading: boolean;
  hasProvider: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  notice: string | null;
};

type WalletContextValue = WalletState & {
  providers: WalletOption[];
  activeProvider: Eip1193Provider | null;
  connect: (option?: WalletOption) => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

function fallbackProvider(): Eip1193Provider | null {
  return typeof window === "undefined" ? null : (window.ethereum ?? null);
}

function providerLabel(provider: Eip1193Provider, announcedName?: string): string {
  if (announcedName) return announcedName;
  if (provider.isMetaMask) return "MetaMask";
  if (provider.isRabby) return "Rabby";
  return "Browser Wallet";
}

function parseChainId(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = value.startsWith("0x") ? Number.parseInt(value, 16) : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseAccounts(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function discoverFallbacks(): WalletOption[] {
  const injected = fallbackProvider();
  if (!injected) return [];
  const providers = injected.providers?.length ? injected.providers : [injected];
  return providers.map((provider, index) => ({
    id: `${providerLabel(provider).toLowerCase().replaceAll(" ", "-")}-${index}`,
    label: providerLabel(provider),
    provider,
  }));
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<WalletOption[]>([]);
  const [activeProvider, setActiveProvider] = useState<Eip1193Provider | null>(null);
  const disconnectedRef = useRef(false);
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isLoading: true,
    hasProvider: false,
    isCorrectNetwork: false,
    error: null,
    notice: null,
  });

  const addProvider = useCallback((option: WalletOption) => {
    setProviders((current) =>
      current.some((item) => item.provider === option.provider) ? current : [...current, option],
    );
  }, []);

  useEffect(() => {
    for (const option of discoverFallbacks()) addProvider(option);
    const onAnnouncement = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963Detail>).detail;
      if (!detail?.provider) return;
      addProvider({
        id: detail.info?.uuid ?? detail.info?.rdns ?? `eip6963-${Date.now()}`,
        label: providerLabel(detail.provider, detail.info?.name),
        provider: detail.provider,
      });
    };
    window.addEventListener("eip6963:announceProvider", onAnnouncement);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnouncement);
  }, [addProvider]);

  const refresh = useCallback(
    async (injected?: Eip1193Provider) => {
      const wallet = injected ?? activeProvider ?? fallbackProvider();
      if (!wallet) {
        const snapshot = {
          address: null,
          chainId: null,
          isConnected: false,
          isLoading: false,
          hasProvider: false,
          isCorrectNetwork: false,
        };
        setState((current) => ({ ...current, ...snapshot, error: null, notice: null }));
        return snapshot;
      }
      const [accountsResult, chainResult] = await Promise.all([
        wallet.request({ method: "eth_accounts" }),
        wallet.request({ method: "eth_chainId" }),
      ]);
      const accounts = parseAccounts(accountsResult);
      const chainId = parseChainId(chainResult);
      const snapshot = {
        address: accounts[0] ?? null,
        chainId,
        isConnected: accounts.length > 0,
        isLoading: false,
        hasProvider: true,
        isCorrectNetwork: chainId === GAVEL_CHAIN_ID,
      };
      setState((current) => ({ ...current, ...snapshot, error: null, notice: null }));
      return snapshot;
    },
    [activeProvider],
  );

  useEffect(() => {
    if (disconnectedRef.current) return;
    void refresh().catch((error: unknown) => {
      const normalized = normalizeWalletError(error);
      setState((current) => ({
        ...current,
        isLoading: false,
        hasProvider: providers.length > 0 || Boolean(fallbackProvider()),
        error: normalized.message,
        notice: null,
      }));
    });
  }, [providers.length, refresh]);

  useEffect(() => {
    if (disconnectedRef.current) return;
    const injected = activeProvider ?? fallbackProvider();
    if (!injected?.on || !injected.removeListener) return;
    const syncProviderState = () => {
      void refresh(injected).catch((error: unknown) => {
        const normalized = normalizeWalletError(error);
        setState((current) => ({
          ...current,
          isLoading: false,
          error: normalized.message,
          notice: null,
        }));
      });
    };
    const onAccountsChanged = syncProviderState;
    const onChainChanged = syncProviderState;
    const onDisconnect = syncProviderState;
    injected.on("accountsChanged", onAccountsChanged);
    injected.on("chainChanged", onChainChanged);
    injected.on("disconnect", onDisconnect);
    return () => {
      injected.removeListener?.("accountsChanged", onAccountsChanged);
      injected.removeListener?.("chainChanged", onChainChanged);
      injected.removeListener?.("disconnect", onDisconnect);
    };
  }, [activeProvider, refresh]);

  const connect = useCallback(
    async (option?: WalletOption) => {
      const injected = option?.provider ?? activeProvider ?? fallbackProvider();
      if (!injected) throw normalizeWalletError(new Error("No EIP-1193 wallet was detected."));
      disconnectedRef.current = false;
      setActiveProvider(injected);
      setState((current) => ({ ...current, isLoading: true, error: null, notice: null }));
      try {
        await injected.request({ method: "eth_requestAccounts" });
        await refresh(injected);
      } catch (error: unknown) {
        const normalized = normalizeWalletError(error);
        setState((current) => ({
          ...current,
          isLoading: false,
          error: normalized.message,
          notice: null,
        }));
        throw normalized;
      }
    },
    [activeProvider, refresh],
  );

  const switchNetwork = useCallback(async () => {
    const injected = activeProvider ?? fallbackProvider();
    if (!injected) throw normalizeWalletError(new Error("No EIP-1193 wallet was detected."));
    disconnectedRef.current = false;
    setActiveProvider(injected);
    setState((current) => ({ ...current, isLoading: true, error: null, notice: null }));
    const switchChain = () =>
      injected.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: GAVEL_CHAIN_ID_HEX }],
      });
    try {
      try {
        await switchChain();
      } catch (error: unknown) {
        const code =
          typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
        if (code !== 4902 && code !== "4902") {
          throw normalizeNetworkSwitchError(error, "switch");
        }
        try {
          await injected.request({
            method: "wallet_addEthereumChain",
            params: [GAVEL_NETWORK_PARAMS],
          });
        } catch (addError: unknown) {
          throw normalizeNetworkSwitchError(addError, "add");
        }
        try {
          await switchChain();
        } catch (switchError: unknown) {
          throw normalizeNetworkSwitchError(switchError, "switch");
        }
      }
      const snapshot = await refresh(injected);
      if (snapshot.chainId !== GAVEL_CHAIN_ID) {
        throw normalizeNetworkSwitchError(
          new Error("Studio Next chain was not confirmed"),
          "confirm",
        );
      }
      setState((current) => ({
        ...current,
        isLoading: false,
        error: null,
        notice: "Wallet connected to Studio Next.",
      }));
    } catch (error: unknown) {
      const normalized =
        error instanceof GavelError ? error : normalizeNetworkSwitchError(error, "confirm");
      setState((current) => ({
        ...current,
        isLoading: false,
        error: normalized.message,
        notice: null,
      }));
      throw normalized;
    }
  }, [activeProvider, refresh]);

  const disconnect = useCallback(() => {
    disconnectedRef.current = true;
    setActiveProvider(null);
    setState((current) => ({
      ...current,
      address: null,
      isConnected: false,
      error: null,
      notice: null,
    }));
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      ...state,
      providers,
      activeProvider,
      connect,
      switchNetwork,
      disconnect,
    }),
    [activeProvider, connect, disconnect, providers, state, switchNetwork],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
