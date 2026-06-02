"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

// Bundles a write + its receipt wait into one status object. One instance per
// independent on-chain action (so a screen with several buttons uses several).
export function useTx() {
  const { data: hash, error, isPending, writeContract, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  return {
    hash,
    error,
    isPending, // awaiting wallet signature
    isConfirming, // tx broadcast, awaiting receipt
    isConfirmed, // mined successfully
    busy: isPending || isConfirming,
    writeContract,
    reset,
  };
}

export type TxState = ReturnType<typeof useTx>;
