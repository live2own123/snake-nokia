import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { base } from "wagmi/chains";

// Base mainnet (chainId 8453) — PRODUCTION. Standard web app (no Farcaster
// Mini App host coupling).
//
// No connectors are declared explicitly. EIP-6963 multi-injected discovery is
// ON by default (multiInjectedProviderDiscovery), so wagmi surfaces every
// announced EVM extension (Rabby, MetaMask, Frame, …) as its own connector —
// those are exactly what the browser picker lists.
export const wagmiConfig = createConfig({
  chains: [base],
  // No connectors declared — EIP-6963 multi-injected discovery supplies them at
  // runtime (omitting the key keeps the general Connector type for the picker).
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
