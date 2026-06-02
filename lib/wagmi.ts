import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { base } from "wagmi/chains";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

// Base mainnet (chainId 8453) — PRODUCTION.
//
// Only ONE connector is declared: farcasterMiniApp. It MUST stay first because
// MiniKit's AutoConnect (used inside Base App) connects to `connectors[0]` and
// only proceeds when its type is a Farcaster type — verified in
// @coinbase/onchainkit AutoConnect. Coinbase Wallet / generic injected were
// removed: they are not used by Base App auto-connect and we want a clean,
// real-wallets-only browser picker.
//
// EIP-6963 multi-injected discovery is ON by default
// (multiInjectedProviderDiscovery), so wagmi surfaces every announced EVM
// extension (Rabby, MetaMask, Frame, …) as its own connector — those are what
// the browser picker lists.
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()],
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
