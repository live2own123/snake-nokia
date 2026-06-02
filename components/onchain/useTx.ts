"use client";

import { useCallback } from "react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import { concatHex, encodeFunctionData, type Abi, type Hex } from "viem";
import { Attribution } from "ox/erc8021";

// ERC-8021 Builder Code attribution. Computed once: a trailing data suffix that
// Base preserves on-chain and that activates attribution when EOA support ships.
// It's appended AFTER the function calldata, so contracts ignore it (trailing
// bytes beyond the decoded args), execution is unaffected.
const DATA_SUFFIX: Hex = Attribution.toDataSuffix({ codes: ["bc_eu6i8wjb"] });

type WriteParams = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  chainId?: typeof base.id;
};

// Bundles a write + its receipt wait into one status object. One instance per
// independent on-chain action (so a screen with several buttons uses several).
//
// Writes go through useSendTransaction (not useWriteContract) so we can append
// the Builder Code suffix to the calldata for our EOA wallets. The public
// `writeContract(params)` shape is unchanged, so call sites don't change.
export function useTx() {
  const { data: hash, error, isPending, sendTransaction, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const writeContract = useCallback(
    (params: WriteParams) => {
      const calldata = encodeFunctionData({
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
      });
      // calldata + ERC-8021 attribution suffix
      const data = concatHex([calldata, DATA_SUFFIX]);

      sendTransaction({
        to: params.address,
        data,
        value: params.value,
        chainId: params.chainId,
      });
    },
    [sendTransaction],
  );

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
