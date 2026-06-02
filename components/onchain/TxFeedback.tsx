"use client";

import type { BaseError } from "wagmi";

import { txUrl } from "../../lib/contracts";
import type { TxState } from "./useTx";

// Renders pending / confirming / success(+Basescan link) / error for one tx.
export function TxFeedback({ tx, confirmText }: { tx: TxState; confirmText: string }) {
  if (tx.error) {
    const msg = (tx.error as BaseError).shortMessage ?? tx.error.message;
    return <p className="tx-msg tx-err">{msg}</p>;
  }
  if (tx.isConfirmed && tx.hash) {
    return (
      <p className="tx-msg tx-ok">
        {confirmText}{" "}
        <a href={txUrl(tx.hash)} target="_blank" rel="noopener noreferrer">
          view tx ↗
        </a>
      </p>
    );
  }
  if (tx.isConfirming) return <p className="tx-msg">confirming on-chain…</p>;
  if (tx.isPending) return <p className="tx-msg">confirm in your wallet…</p>;
  return null;
}
