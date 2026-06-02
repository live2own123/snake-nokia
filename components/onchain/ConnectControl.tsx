"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useConnectors, useDisconnect } from "wagmi";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// "User rejected the request" (EIP-1193 code 4001) — the user dismissed the
// wallet popup. Treat it as a soft, expected outcome, not an error.
function isUserRejection(err: unknown): boolean {
  let e: unknown = err;
  while (e && typeof e === "object") {
    const o = e as { name?: string; code?: number; cause?: unknown };
    if (o.name === "UserRejectedRequestError" || o.code === 4001) return true;
    e = o.cause;
  }
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return msg.includes("user rejected") || msg.includes("user denied");
}

// Custom connect UI on raw wagmi hooks. Lists ONLY real EIP-6963 EVM wallets.
export function ConnectControl() {
  const { address, isConnected } = useAccount();
  const connectors = useConnectors(); // reactive: updates as wallets announce via EIP-6963
  const { connect, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close the menu on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (isConnected && address) {
    return (
      <div className="connect-control" ref={ref}>
        <button className="btn btn-ghost connect-pill" onClick={() => disconnect()} title={address}>
          {short(address)} · disconnect
        </button>
      </div>
    );
  }

  // All connectors are EIP-6963-discovered wallets (none are declared in the
  // wagmi config). Each installed wallet (Rabby, MetaMask, Frame, …) announces
  // with a distinct rdns -> distinct connector id, so we dedupe by id (NOT name)
  // to keep every distinct wallet when several are installed, while collapsing a
  // wallet that happens to announce twice.
  const seen = new Set<string>();
  const wallets = connectors.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const rejected = isUserRejection(error);

  function toggle() {
    reset(); // clear any prior (e.g. rejected) state when reopening
    setOpen((o) => !o);
  }

  return (
    <div className="connect-control" ref={ref}>
      <button
        className="btn btn-primary"
        onClick={toggle}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>

      {open && (
        <div className="connect-menu" role="menu">
          {wallets.length === 0 ? (
            <span className="connect-empty">
              No EVM wallet detected — install{" "}
              <a href="https://rabby.io" target="_blank" rel="noopener noreferrer">
                Rabby
              </a>{" "}
              or{" "}
              <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
                MetaMask
              </a>
              .
            </span>
          ) : (
            wallets.map((c) => (
              <button
                key={c.uid}
                className="connect-option"
                role="menuitem"
                disabled={isPending}
                onClick={() => {
                  reset();
                  connect({ connector: c });
                }}
              >
                {c.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.icon} alt="" width={16} height={16} className="connect-icon" />
                )}
                {c.name}
              </button>
            ))
          )}

          {rejected && <p className="tx-msg">connection cancelled — pick a wallet to try again</p>}
          {error && !rejected && <p className="tx-msg tx-err">{error.message}</p>}
        </div>
      )}
    </div>
  );
}
