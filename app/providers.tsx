"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";

import { wagmiConfig } from "../lib/wagmi";

// OnchainKitProvider (v1) supplies OnchainKit + reuses the WagmiProvider /
// QueryClientProvider above, and — via the `miniKit` option — mounts the
// MiniKit context so `useMiniKit()`/`setFrameReady()` work. Configured for
// Base mainnet (production, chainId 8453).
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          miniKit={{ enabled: true }}
          config={{
            appearance: {
              name: "Snake",
              mode: "dark",
              theme: "default",
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
