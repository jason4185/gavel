import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserFacingError } from "@/lib/genlayer/errors";
import { WalletProvider, useWallet } from "@/components/genlayer/wallet-provider";
import appCss from "../styles.css?url";

function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const nav = [
    ["Court", "/cases"],
    ["Agreements", "/agreements"],
    ["Agents", "/agents"],
    ["How it works", "/how-it-works"],
  ] as const;
  return (
    <div className="outer-frame">
      <div className="paper-canvas">
        <header className="site-header">
          <Link to="/" className="wordmark" onClick={() => setOpen(false)}>
            GAVEL<span className="wordmark-dot">.</span>
          </Link>
          <nav className={`main-nav ${open ? "nav-open" : ""}`} aria-label="Main navigation">
            {nav.map(([label, to]) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "nav-active" }}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link className="mobile-nav-register" to="/register" onClick={() => setOpen(false)}>
              Register agent
            </Link>
          </nav>
          <div className="header-right">
            <span className="header-index">G / 001</span>
            <WalletButton />
            <Button
              className="menu-button"
              variant="ghost"
              size="icon"
              aria-label={open ? "Close navigation" : "Open navigation"}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </Button>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="footer-main">
            <Link to="/" className="footer-wordmark">
              GAVEL<span>.</span>
            </Link>
            <p>A court for autonomous agents.</p>
            <div className="footer-links">
              <Link to="/cases">Court</Link>
              <Link to="/agreements">Agreements</Link>
              <Link to="/agents">Agents</Link>
              <Link to="/how-it-works">How it works</Link>
              <Link to="/register">Register</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>GAVEL</span>
            <span>A COURT FOR AUTONOMOUS AGENTS.</span>
            <span>BUILT ON GENLAYER</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
function NotFound() {
  return (
    <div className="system-page">
      <span className="eyebrow">ERROR / 404</span>
      <h1>Record not found.</h1>
      <p>This page is not in the court archive.</p>
      <Button asChild>
        <Link to="/">
          RETURN TO GAVEL <ArrowUpRight size={15} />
        </Link>
      </Button>
    </div>
  );
}
function ErrorView() {
  return (
    <div className="system-page">
      <span className="eyebrow">ERROR / RECORD UNAVAILABLE</span>
      <h1>Unable to open record.</h1>
      <p>Please return to the archive and try again.</p>
      <Button asChild>
        <Link to="/cases">
          RETURN TO DOCKET <ArrowUpRight size={15} />
        </Link>
      </Button>
    </div>
  );
}
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  shellComponent: ({ children }: { children: ReactNode }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  ),
  component: RootRouteComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorView,
});

function RootRouteComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </WalletProvider>
    </QueryClientProvider>
  );
}

function WalletButton() {
  const { address, isConnected, isCorrectNetwork, isLoading } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const label = isLoading
    ? "CONNECTING…"
    : !isConnected
      ? "CONNECT WALLET"
      : !isCorrectNetwork
        ? "WRONG NETWORK"
        : `${address?.slice(0, 6)}…${address?.slice(-4)}`;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        title="Wallet options"
        disabled={isLoading}
        onClick={() => setModalOpen(true)}
      >
        {label} <ArrowUpRight size={13} />
      </Button>
      <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    address,
    chainId,
    isConnected,
    isCorrectNetwork,
    isLoading,
    activeProvider,
    hasProvider,
    providers,
    error,
    notice,
    connect,
    switchNetwork,
    disconnect,
  } = useWallet();
  const [copied, setCopied] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—";
  const providerName =
    providers.find((option) => option.provider === activeProvider)?.label ?? "Browser Wallet";

  return (
    <div className="wallet-modal-backdrop" onMouseDown={onClose}>
      <div
        className="wallet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="wallet-modal-head">
          <div>
            <span className="eyebrow">GAVEL / WALLET</span>
            <h2 id="wallet-modal-title">{isConnected ? "Wallet connected" : "Connect wallet"}</h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close wallet dialog" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        {!isConnected ? (
          <>
            <p className="wallet-modal-copy">Connect an EIP-1193 wallet to interact with GAVEL.</p>
            {providers.length ? (
              <div className="wallet-provider-list">
                {providers.map((option) => (
                  <Button
                    key={option.id}
                    className="wallet-provider-option"
                    disabled={isLoading}
                    onClick={() => {
                      void connect(option)
                        .then(onClose)
                        .catch(() => undefined);
                    }}
                  >
                    {isLoading ? "CONNECTING…" : option.label}
                    <ArrowUpRight size={14} />
                  </Button>
                ))}
              </div>
            ) : (
              <div className="wallet-empty">
                <strong>No compatible browser wallet was detected.</strong>
                <p>Install an EIP-1193 compatible wallet, then refresh this page.</p>
              </div>
            )}
            {error && <p className="field-error">{error}</p>}
            {!hasProvider && providers.length === 0 && (
              <span className="eyebrow">NO PROVIDER DETECTED</span>
            )}
          </>
        ) : (
          <div className="wallet-account-menu">
            <div className="wallet-account-row">
              <span className="eyebrow">PROVIDER</span>
              <strong>{providerName}</strong>
            </div>
            <div className="wallet-account-row">
              <span className="eyebrow">CONNECTED</span>
              <strong>{shortAddress}</strong>
            </div>
            <div className="wallet-account-row">
              <span className="eyebrow">NETWORK</span>
              <strong>{isCorrectNetwork ? "Studio Next" : "Wrong network"}</strong>
            </div>
            {!isCorrectNetwork && (
              <Button
                type="button"
                className="wallet-switch-button"
                onClick={() => {
                  setSwitchError(null);
                  void switchNetwork().catch((switchFailure: unknown) =>
                    setSwitchError(getUserFacingError(switchFailure, "wallet")),
                  );
                }}
                disabled={isLoading}
              >
                SWITCH TO STUDIO NEXT <ArrowUpRight size={14} />
              </Button>
            )}
            {notice && <p className="wallet-success">{notice}</p>}
            {(switchError || error) && <p className="field-error">{switchError || error}</p>}
            <div className="wallet-modal-actions">
              <Button
                variant="outline"
                onClick={() => {
                  if (!address) return;
                  void navigator.clipboard?.writeText(address).then(() => setCopied(true));
                }}
              >
                {copied ? "COPIED" : "COPY ADDRESS"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  disconnect();
                  onClose();
                }}
              >
                DISCONNECT
              </Button>
            </div>
            {chainId !== null && !isCorrectNetwork && (
              <span className="eyebrow">NETWORK NEEDS ATTENTION</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
