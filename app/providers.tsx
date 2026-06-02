"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { wagmiConfig } from "../lib/wagmi";

// Standard web app providers: wagmi + React Query. No OnchainKit/MiniKit — the
// app talks to Base mainnet directly via wagmi/viem, and the wallet picker is a
// plain wagmi EIP-6963 control (see components/onchain/ConnectControl).
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
