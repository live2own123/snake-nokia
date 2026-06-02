import { base } from "wagmi/chains";

import { nameRegistryAbi } from "./abis/NameRegistry";
import { checkInAbi } from "./abis/CheckIn";
import { leaderboardAbi } from "./abis/Leaderboard";
import { gameNFTAbi } from "./abis/GameNFT";

// All contracts are live on Base mainnet. Reads/writes pin this chainId.
export const CHAIN_ID = base.id; // 8453

type Address = `0x${string}`;

// Deployed Base mainnet (8453) addresses. Do not change without a matching
// redeploy.
export const NAME_REGISTRY = {
  address: "0xd7139f3908b153c3a692b5ff8e8d2a5396e64b3d" as Address,
  abi: nameRegistryAbi,
} as const;

export const CHECK_IN = {
  address: "0xd13e24ee4230bd5756906e1bc7119f661752fa4b" as Address,
  abi: checkInAbi,
} as const;

export const LEADERBOARD = {
  address: "0x9f1a144d75391f09ac73f0e81c5638d896b3da59" as Address,
  abi: leaderboardAbi,
} as const;

export const GAME_NFT = {
  address: "0xec6a8a45d313f302b3b36e54fde018520f7a4f71" as Address,
  abi: gameNFTAbi,
} as const;

// Block explorer helper for surfacing tx links.
export function txUrl(hash: string): string {
  return `https://basescan.org/tx/${hash}`;
}
