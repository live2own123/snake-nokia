"use client";

import { useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";

import { CHAIN_ID, CHECK_IN } from "../../lib/contracts";
import { useTx } from "./useTx";
import { TxFeedback } from "./TxFeedback";

// Daily check-in control: shows the current streak and today's availability,
// calls checkIn(), then refreshes both reads on success.
export function CheckInPanel() {
  const { address } = useAccount();
  const tx = useTx();

  const { data: streak, refetch: refetchStreak } = useReadContract({
    ...CHECK_IN,
    functionName: "getStreak",
    args: [address!],
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  });

  const { data: canCheckIn, refetch: refetchCan } = useReadContract({
    ...CHECK_IN,
    functionName: "canCheckIn",
    args: [address!],
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (tx.isConfirmed) {
      refetchStreak();
      refetchCan();
    }
  }, [tx.isConfirmed, refetchStreak, refetchCan]);

  const available = canCheckIn === true;

  return (
    <div className="onchain-card">
      <div className="streak-chip">
        <span className="streak-flame">🔥</span> streak <b>{streak?.toString() ?? "0"}</b>
      </div>
      <button
        className="btn btn-primary"
        disabled={!available || tx.busy}
        onClick={() => tx.writeContract({ ...CHECK_IN, functionName: "checkIn", chainId: CHAIN_ID })}
      >
        {tx.busy ? "…" : available ? "Daily check-in" : "Checked in today ✓"}
      </button>
      <TxFeedback tx={tx} confirmText="checked in!" />
    </div>
  );
}
