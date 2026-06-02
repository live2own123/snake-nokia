# Snake → Base Mini App: Audit & Implementation Plan

_Planning deliverable. No feature code in this task._
_Target: Base Sepolia testnet first; Base mainnet only at the very end._

---

## 1. Codebase Audit

The repo is a minimal **Vite + React 19 + TypeScript** scaffold. The entire game lives in **one component** (`src/App.tsx`, ~340 lines). It is _not_ a vanilla-JS game — it is already React, which makes a framework port cheap.

### Structure of `src/` (and relevant root/public)

| Path | Role |
|---|---|
| `src/App.tsx` | The whole game: state, loop, input, canvas rendering, UI. |
| `src/main.tsx` | Entry point — `createRoot(...).render(<StrictMode><App/></StrictMode>)`. |
| `src/index.css` | **Default Vite boilerplate, effectively unused** — `App.tsx` styles everything with inline objects. |
| `src/assets/react.svg` | Leftover scaffold asset. |
| `index.html` | Has `<meta name="base:app_id" content="69a93ce2223099cde830596c">`, `theme-color #0A1020`, mobile-web-app meta. |
| `public/.well-known/farcaster.json` | **Signed manifest** (`accountAssociation` + `miniapp` block) bound to domain `snakenokiabase.vercel.app`. |
| `public/` | `app-icon.png`, `splash.png`, `og.png`, `favicon.svg` (manifest also references `shot1.png`, which is **not present**). |

Dependencies of note (`package.json`): `react@19`, `react-dom@19`, **`@farcaster/miniapp-sdk@^0.2.3`**. There is **no** `wagmi`, `viem`, `@coinbase/onchainkit`, or MiniKit yet. The miniapp SDK is wired only minimally.

### Game loop
`useEffect` at `App.tsx:198–239`. A single `window.setInterval` (`loopRef`) fires every `tickMs`; each tick calls `setSnake(prev => …)` to advance one cell. Effect re-subscribes on `[running, paused, dead, nextDir, food, tickMs]`. `stopLoop()` (`86–91`) clears the interval. Speed scales with score via `speed` (`useMemo`, `71–75`) → `tickMs = max(55, 1000/speed)` (`77`).

### Input / keyboard handling
- **Keyboard:** `useEffect` `136–150`, handler `onKey`. Arrow keys set `nextDir` (guarded by `isOpposite`, `25–32`); space = pause, `r` = restart, `s` = start.
- **Swipe:** `useEffect` `153–195`, `onTouchStart`/`onTouchEnd` on the canvas, 14px dead-zone, dominant-axis → direction.
- **No on-screen directional buttons exist yet.** Only `start / pause / restart` buttons (`296–308`).

### Rendering approach
**HTML5 Canvas 2D**, not DOM. Draw `useEffect` `242–268`: clears with `BG`, dots the grid, draws food then snake cells. `overlay()` (`318–328`) renders the "snake / paused / game over" cards _on the canvas_. Fixed internal size `GRID*CELL = 18*20 = 360px`, CSS-scaled to `width:100%` (`281–293`). `touchAction:"none"` set inline.

### Score & state management
All via React `useState` inside `App`: `snake`, `nextDir`, `food`, `score`, `best`, `running`, `paused`, `dead`. `best` is seeded from and persisted to `localStorage["snake_best"]` (`65`, `129–132`). `die(finalScore)` (`122–133`) stops the loop, sets `dead`, and updates best. Wraps walls (`wrap`, `41–45`); only self-collision kills (`218–221`). No external store, no contract calls — **all state is local/in-memory.**

### Styling approach
**Inline style objects + module-level color constants** (`BG`, `PANEL`, `SNAKE_HEAD`, `FOOD`, etc., `12–19`; `btnStyle`, `330–338`). Self-described as "Base-ish blue" — dark navy `#0A1020`, blue food `#3B82F6`. **It does not use the official Base palette.** `index.css` is unused scaffold CSS. No Tailwind, no CSS modules.

### Mini-app wiring already present
- `sdk.actions.ready()` in a `useEffect` (`App.tsx:48–50`) — splash dismissal.
- Signed `farcaster.json` for `snakenokiabase.vercel.app`, `primaryCategory: games`.
- `base:app_id` meta in `index.html`.
- **Missing:** wallet/connectors, wagmi, OnchainKit/MiniKit provider, any contracts, any backend.

---

## 2. Framework Decision

> ### ✅ Recommendation: **(a) Port into a Next.js + MiniKit scaffold** (`npx create-onchain --mini`).

### Why
1. **Phase E requires a server.** Server-signed score submission (anti-cheat) needs a trusted backend to validate a run and sign an attestation. Vite builds to **static assets only** — option (b) forces a *separate* server/serverless deploy (extra infra, CORS, auth). Next.js Route Handlers give you that backend **in the same deploy**.
2. **The recurring check-in loop wants notifications/webhooks.** The `create-onchain --mini` scaffold ships backend routes for frames/webhooks/notifications — directly useful for re-engaging users on their daily UTC check-in. Re-creating this on Vite is manual.
3. **MiniKit is Coinbase's officially supported path** and its first-class home is Next.js. The CLI auto-wires **`MiniKitProvider` + wagmi + OnchainKit + Tailwind** in `app/layout.tsx`. Option (b) means hand-rolling provider/connector glue that MiniKit gives for free, with less official support inside Base App.
4. **OnchainKit components** (`<Transaction>`, `<Wallet>`, `<Identity>`) cut Phase D contract-wiring effort substantially.
5. **The port is cheap.** The game is already a single self-contained React 19 component. Inline styles and canvas logic move over essentially verbatim into a client component (`"use client"`). Estimated **~0.5–1 day** to reach feature parity on Next.js.

### Cost / caveats of choosing (a)
- The current static `public/.well-known/farcaster.json` becomes a manifest **route/asset** under Next.js. The existing `accountAssociation` is **domain-bound** — it can be reused **only if the production domain stays the same**. A domain change requires re-signing the association.
- Tailwind arrives with the scaffold; the inline-style game can stay inline initially and be migrated opportunistically.

### When (b) would win
Only if there were a hard constraint to keep Vite (there isn't) and zero backend need (there is — Phase E). Given the locked product (anti-cheat + check-in loop), (b) accrues more total work than (a). **Not recommended.**

---

## 3. Phased Implementation Plan

> **Brand correction (verified against official Base brand resources):** the current official **Base Blue is `#0000FF`** (RGB 0,0,255), **not** `#0052FF` (a legacy value). Confirm before Phase A — see Open Questions. Official palette captured below.

**Official Base palette (from `brand.base.org/color`):**
- Core: Base Blue `#0000FF` · Black `#0A0B0D` · White `#FFFFFF`
- Gray ramp: `#EEF0F3` `#DEE1E7` `#B1B7C3` `#717886` `#5B616E` `#32353D`
- Secondary: Cerulean `#3C8AFF` · Tan `#B8A581` · Red `#FC401F` · Yellow `#FFD12F` · Pink `#FEA8CD` · Green `#66C800` · Lime `#B6F569`
- Brand guidance: _lead with monochrome, spotlight one accent_ — reserve Base Blue for the highest-impact element.

---

### Phase A — Mobile controls + Base-blue UI refresh (frontend only)
**Build:** On-screen directional arrow D-pad (keep existing swipe + keyboard); re-skin to the official Base palette (monochrome grays + Base Blue accent); replace canvas-drawn overlays with a proper DOM **game-over card** (score, best, "play again", and placeholder slots for the on-chain buttons added later); crisp typography; surface a streak/check-in area placeholder; safe-area / viewport polish for phones.
**Files touched:** `src/App.tsx` (add D-pad component + game-over card; swap color constants); `src/index.css` or Tailwind config (replace boilerplate, define palette tokens); `index.html` (`theme-color` → align to chosen surface color).
**Risks:** Touch buttons must not trigger page scroll/zoom (`touch-action`, `preventDefault`); D-pad + swipe both writing `nextDir` could race — centralize direction setting; canvas crispness on hi-DPI (consider `devicePixelRatio` scaling). React **StrictMode double-invokes effects** — verify the loop interval and `sdk.actions.ready()` stay idempotent.

### Phase B — Mini app shell (MiniKit, signed manifest, wallet)
**Build:** Scaffold Next.js via `npx create-onchain --mini`; port the Phase-A game in as a client component; add `MiniKitProvider` (chain = **Base Sepolia**) in `app/layout.tsx`; wallet connect surfaced; regenerate/host the **signed `farcaster.json`** for the production domain; call `setFrameReady()`/`ready()` to dismiss splash; carry over icon/splash/og assets and **add the missing `shot1.png`**.
**Files touched:** new Next.js project (`app/layout.tsx`, `app/page.tsx`, providers); `app/.well-known/farcaster.json` (or route handler) + `accountAssociation`; `public/` assets; env (`NEXT_PUBLIC_*` keys, OnchainKit/CDP API key).
**Risks:** Manifest signature is domain-bound — pin the production domain early or plan to re-sign; preview deploy domains won't match the manifest; ensure `ready()` fires after first paint so users don't see a stuck splash; React 19 / Next version alignment with the scaffold.

### Phase C — Smart contracts on Base Sepolia
**Build (modular, OpenZeppelin-based, Foundry or Hardhat):**
- **`NameRegistry`** — `register(string name) payable`, one-time per address ever; enforce **max 34 chars, alphanumeric, on-chain uniqueness** (store `keccak256(lowercased name)` in a `taken` mapping; reject if `names[msg.sender]` already set). Emits `NameRegistered`.
- **`CheckIn`** — `checkIn()` once per **UTC day** (`block.timestamp / 86400`); increments `streak` if the previous day was claimed, else resets to 1; tracks `longest`. Emits `CheckedIn`.
- **`Leaderboard`** — `saveScore(...)` (user-triggered) writing top-N + `topScore`; exposes current top score for the claim gate. Emits `ScoreSaved`. (In Phase E this gains a signature parameter.)
- **`GameNFT` (ERC-721)** — `mintGamePlayed()` (user-triggered, any run) and `mintLeaderboardNFT()` (gated: only if the run beats `Leaderboard.topScore`). Distinct token metadata/URIs for the two mint types.

**Files/contracts:** `contracts/` (`NameRegistry.sol`, `CheckIn.sol`, `Leaderboard.sol`, `GameNFT.sol`), deploy scripts, tests, deployed-address + ABI export for the frontend.
**Risks:** **On-chain alphanumeric validation is gas-heavy** (byte-loop) — measure cost. Case-insensitive uniqueness needs a defined normalization. Leaderboard top-N storage/sorting can be expensive — prefer event-indexed reads + a single `topScore` slot for the gate. UTC-day logic relies on `block.timestamp`. **Scores are still client-trusted until Phase E** — leaderboard/claim are spoofable in the interim (acceptable on testnet).

### Phase D — Wire contracts into the game
**Build:** Connect each on-chain action through wagmi hooks / OnchainKit `<Transaction>`: **register name** (one-time gated UI), **daily check-in + streak display** (the headline engagement surface from Phase A), **save score** button on the game-over card, **mint "game played" NFT** button, and **claim leaderboard NFT** button **enabled only when the run > on-chain top score**. Reflect tx pending/success/error states; show streak and best from chain.
**Files touched:** `app/page.tsx`/game component, new hooks (`useNameRegistry`, `useCheckIn`, `useLeaderboard`, `useGameNFT`), contract config (addresses/ABIs), game-over card.
**Risks:** Reading `topScore` at game-over to toggle the claim button (stale/race vs. concurrent submitters); double-submission / spamming buttons; gas-failure UX inside Base App; one-time register UX must be unmistakable (irreversible); keep **play/replay free** — no tx on start (matches current code, which has no pay gate).

### Phase E — Anti-cheat (server-signed score submission) + polish
**Build:** Game reports the run to a Next.js Route Handler; server validates plausibility (duration vs. score, growth rate, rate-limit per address) and returns an **EIP-712 signed score attestation**; `Leaderboard.saveScore` and the leaderboard-NFT claim are updated to **require a signature from a trusted signer**; signer key held server-side. General polish: animations, sound, share-to-feed, empty/error states.
**Files touched:** `app/api/score/route.ts` (validate + sign), signer key in env, `Leaderboard.sol` + `GameNFT.sol` (verify signature, store used-nonce to prevent replay), client submission flow.
**Risks:** Signer key custody (rotate-able, never client-side); replay protection (nonce/deadline per attestation); validation heuristics balance (false rejects vs. cheat tolerance); deciding what's truly verifiable server-side without full server-authoritative gameplay.

### Phase F — Base Builder registration + mainnet deploy + go live
**Build:** Register the app via Base Builder / `base.dev`; deploy the four contracts to **Base mainnet** and repoint the frontend; re-sign `farcaster.json` for the final production domain; final manifest/listing assets (screenshots, hero, og); smoke-test the full flow in Base App on mainnet.
**Files touched:** mainnet deploy scripts/addresses, env switch (Sepolia→mainnet), `farcaster.json` (re-signed), listing assets, `index.html`/metadata.
**Risks:** Real-gas economics of `NameRegistry` fee and mints; contracts are **immutable on mainnet** — audit before deploy; manifest re-sign for final domain; verify contracts on Basescan; staged rollout (keep Sepolia as staging).

---

## 4. Open Questions & Assumptions to Confirm Before Phase A

1. **Base Blue value.** Official current Base Blue is **`#0000FF`**, not `#0052FF` from the brief. Use the official `#0000FF` (recommended), or intentionally keep `#0052FF`? _Assumption: use `#0000FF` + the verified palette above._
2. **Production domain.** Stay on `snakenokiabase.vercel.app` (lets us reuse the existing signed `accountAssociation`) or move to a custom domain (requires re-signing)? Pinning this early avoids manifest churn across Phases B/F.
3. **Name registry fee.** What price (in ETH) for the one-time name registration on Sepolia/mainnet? And confirm **case-insensitive** uniqueness + the exact allowed charset (digits + a–z only? underscores?).
4. **Leaderboard shape.** Global top-N only, or per-player best too? How many entries displayed? This drives on-chain storage cost.
5. **NFT art/metadata.** Who provides "game played" vs. "special leaderboard" NFT artwork and metadata, and where is it hosted (IPFS)?
6. **Gas sponsorship.** Use a Paymaster to sponsor check-in/mint gas for smoother UX, or users pay their own gas? Affects Phase B/D wiring.
7. **Anti-cheat strictness (Phase E).** How aggressive should validation be, and is a client-trusted leaderboard acceptable on testnet until E lands? _Assumption: yes on Sepolia._
8. **Existing `base:app_id` / Builder code.** Is `69a93ce2223099cde830596c` the canonical Base App ID to carry forward, and is there an existing Base Builder registration to reuse in Phase F?

---

## Recommended First Build Step

**Start Phase A on the current Vite app — do _not_ scaffold Next.js yet.** Lock the UI/UX and palette where iteration is fastest:

1. Confirm the brand color (Open Question #1 — default to official **`#0000FF`**).
2. In `src/App.tsx`, add an on-screen **directional D-pad** (alongside existing swipe/keyboard), centralizing all direction changes through one guarded setter.
3. Re-skin to the official Base palette (monochrome grays + Base Blue accent).
4. Replace the canvas `overlay()` game-over screen with a real **DOM game-over card** that already includes labeled placeholder slots for the future on-chain buttons (register / check-in / save score / mint / claim) and a streak area.

This is pure frontend, ships value immediately, and produces the exact component that gets dropped into the Next.js + MiniKit scaffold in Phase B — so none of it is throwaway.

---

_Sources: [Base brand — color](https://brand.base.org/color), [MiniKit overview](https://docs.base.org/builderkits/minikit/overview), [Make your web app a Mini App](https://docs.base.org/cookbook/converting-customizing-mini-apps), [OnchainKit](https://github.com/coinbase/onchainkit)._
