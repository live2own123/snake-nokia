"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";

import { CHAIN_ID, NAME_REGISTRY } from "../../lib/contracts";
import { useTx } from "./useTx";
import { TxFeedback } from "./TxFeedback";

// Client-side validation mirroring NameRegistry._validate:
// charset [a-z0-9_], length 3-34, and not entirely underscores.
const NAME_RE = /^[a-z0-9_]{3,34}$/;
export function validateName(n: string): string | null {
  if (n.length < 3 || n.length > 34) return "must be 3–34 characters";
  if (!NAME_RE.test(n)) return "only a–z, 0–9 and _";
  if (!/[a-z0-9]/.test(n)) return "needs at least one letter or digit";
  return null;
}

// First-run surface: shown only when the connected address has no name yet.
// Calls register(name) payable with value = registrationFee().
export function RegisterName({ onRegistered }: { onRegistered: () => void }) {
  const [name, setName] = useState("");
  const tx = useTx();

  const { data: fee } = useReadContract({
    ...NAME_REGISTRY,
    functionName: "registrationFee",
    chainId: CHAIN_ID,
  });

  useEffect(() => {
    if (tx.isConfirmed) onRegistered();
  }, [tx.isConfirmed, onRegistered]);

  const validationError = name ? validateName(name) : null;

  function submit() {
    if (validateName(name)) return;
    tx.writeContract({
      ...NAME_REGISTRY,
      functionName: "register",
      args: [name],
      value: fee ?? 0n,
      chainId: CHAIN_ID,
    });
  }

  return (
    <div className="onchain-card">
      <span className="onchain-label">claim your player name — one time, on-chain</span>
      <div className="register-row">
        <input
          className="name-input"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          placeholder="snake_master"
          maxLength={34}
          spellCheck={false}
          autoCapitalize="none"
          disabled={tx.busy}
        />
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={tx.busy || !name || !!validationError}
        >
          {tx.busy ? "…" : "Register"}
        </button>
      </div>
      {validationError && <p className="tx-msg tx-err">{validationError}</p>}
      <TxFeedback tx={tx} confirmText="name registered!" />
    </div>
  );
}
