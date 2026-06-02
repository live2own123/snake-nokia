"use client";

import { useAccount } from "wagmi";

import { CHAIN_ID, GAME_NFT, LEADERBOARD } from "../../lib/contracts";
import { useTx } from "./useTx";
import { TxFeedback } from "./TxFeedback";
import { ConnectControl } from "./ConnectControl";
import { SwitchNetworkButton, useIsWrongNetwork } from "./SwitchNetworkButton";

// Game-over on-chain actions. Save score + Mint NFT are live. The leaderboard
// champion claim is intentionally NOT exposed for launch: the leaderboard is
// spoofable until Phase E (server-signed scores), so we don't call
// GameNFT.claimChampion() from the UI. The on-chain function still exists.
export function GameOverActions({ finalScore }: { finalScore: number }) {
  const { isConnected } = useAccount();
  const wrongNetwork = useIsWrongNetwork();

  const saveTx = useTx();
  const mintTx = useTx();

  const score = BigInt(finalScore);

  if (!isConnected) {
    return (
      <div className="card-onchain">
        <span className="card-onchain-label">connect to save your run on-chain</span>
        <ConnectControl />
      </div>
    );
  }

  // Wrong chain: suppress the raw "chain mismatch" write error, block all
  // writes, offer the single switch action instead.
  if (wrongNetwork) {
    return (
      <div className="card-onchain">
        <span className="card-onchain-label">wrong network — switch to save on-chain</span>
        <SwitchNetworkButton />
      </div>
    );
  }

  return (
    <div className="card-onchain">
      <span className="card-onchain-label">on-chain · Base Sepolia</span>

      <div className="card-onchain-grid">
        <button
          className="btn btn-onchain"
          disabled={saveTx.busy}
          onClick={() =>
            saveTx.writeContract({
              ...LEADERBOARD,
              functionName: "submitScore",
              args: [score],
              chainId: CHAIN_ID,
            })
          }
        >
          {saveTx.busy ? "…" : "Save score"}
        </button>

        <button
          className="btn btn-onchain"
          disabled={mintTx.busy}
          onClick={() =>
            mintTx.writeContract({
              ...GAME_NFT,
              functionName: "mintPlayed",
              args: [score],
              chainId: CHAIN_ID,
            })
          }
        >
          {mintTx.busy ? "…" : "Mint NFT"}
        </button>

        {/* Claim is disabled for launch — see component note. Renders as an
            inert "coming soon" button; does NOT call claimChampion(). */}
        <button className="btn btn-onchain btn-onchain-wide" disabled aria-disabled>
          Claim leaderboard NFT · coming soon
        </button>
      </div>

      <TxFeedback tx={saveTx} confirmText="score saved!" />
      <TxFeedback tx={mintTx} confirmText="NFT minted!" />
    </div>
  );
}
