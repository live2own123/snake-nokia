"use client";

import { useAccount, useSwitchChain } from "wagmi";

import { CHAIN_ID } from "../../lib/contracts";

// True when a wallet is connected but on a chain other than Base mainnet.
export function useIsWrongNetwork(): boolean {
  const { isConnected, chainId } = useAccount();
  return isConnected && chainId != null && chainId !== CHAIN_ID;
}

// Full Base mainnet params so a wallet that doesn't have the network yet can
// ADD it during the switch (wallet_addEthereumChain fallback).
const BASE_PARAMS = {
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
};

// One clear action shown wherever a write would otherwise fail on the wrong
// chain. On success the connected chainId updates and callers re-render back to
// their normal UI automatically.
export function SwitchNetworkButton() {
  const { switchChain, isPending, error } = useSwitchChain();
  const rejected =
    !!error && /rejected|denied|4001/i.test(error.message + (error.name ?? ""));

  return (
    <div className="switch-network">
      <button
        className="btn btn-primary"
        disabled={isPending}
        onClick={() =>
          switchChain({ chainId: CHAIN_ID, addEthereumChainParameter: BASE_PARAMS })
        }
      >
        {isPending ? "Switching…" : "Switch to Base"}
      </button>
      {error && (
        <p className="tx-msg">
          {rejected ? "switch cancelled — try again to continue" : "approve the network switch in your wallet"}
        </p>
      )}
    </div>
  );
}
