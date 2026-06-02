"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAccount, useReadContract } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

import type { Cell, Dir } from "../lib/types";
import { CANVAS } from "../lib/theme";
import { CHAIN_ID, NAME_REGISTRY } from "../lib/contracts";
import DPad from "./DPad";
import GameOverCard from "./GameOverCard";
import { RegisterName } from "./onchain/RegisterName";
import { CheckInPanel } from "./onchain/CheckInPanel";
import { ConnectControl } from "./onchain/ConnectControl";
import { SwitchNetworkButton } from "./onchain/SwitchNetworkButton";

const GRID = 18;
const CELL = 20;

function same(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

function isOpposite(a: Dir, b: Dir) {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

function dirVec(d: Dir): Cell {
  if (d === "up") return { x: 0, y: -1 };
  if (d === "down") return { x: 0, y: 1 };
  if (d === "left") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

function wrap(n: number) {
  if (n < 0) return GRID - 1;
  if (n >= GRID) return 0;
  return n;
}

// Pure helper (no state/props) — module scope keeps it stable for useCallback deps.
function spawnFood(s: Cell[]): Cell {
  while (true) {
    const f = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!s.some((c) => same(c, f))) return f;
  }
}

export default function App() {
  // MiniKit: dismiss the host splash once the app has mounted (replaces the
  // old @farcaster/miniapp-sdk `sdk.actions.ready()` call).
  const { setFrameReady, isFrameReady } = useMiniKit();
  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  // On-chain player name (NameRegistry). The nameOf read targets Base mainnet
  // regardless of the wallet's current chain, so registration state is accurate
  // even when the wallet is on the wrong network.
  const { address, isConnected, chainId } = useAccount();
  const { data: nameData, refetch: refetchName } = useReadContract({
    ...NAME_REGISTRY,
    functionName: "nameOf",
    args: [address!],
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  });
  const playerName = typeof nameData === "string" && nameData.length > 0 ? nameData : "";
  const isRegistered = playerName.length > 0;

  // Gameplay is a HARD gate: connected + on Base mainnet + a registered name.
  const isWrongNetwork = isConnected && chainId != null && chainId !== CHAIN_ID;
  const canPlay = isConnected && !isWrongNetwork && isRegistered;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loopRef = useRef<number | null>(null);

  const [snake, setSnake] = useState<Cell[]>([
    { x: 9, y: 9 },
    { x: 8, y: 9 },
    { x: 7, y: 9 },
  ]);

  const [nextDir, setNextDir] = useState<Dir>("right");
  const [food, setFood] = useState<Cell>({ x: 4, y: 6 });

  const [score, setScore] = useState(0);
  // best is read from localStorage in an effect (not during render) so this
  // client component still server-renders cleanly.
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    const stored = Number(localStorage.getItem("snake_best") || 0);
    if (stored) setBest(stored);
  }, []);

  const speed = useMemo(() => {
    const base = 9;
    const bonus = Math.floor(score / 5) * 2;
    return base + bonus;
  }, [score]);

  const tickMs = useMemo(() => Math.max(55, Math.floor(1000 / speed)), [speed]);

  // Single place every input funnels through (keyboard, swipe, D-pad). The
  // opposite-direction guard lives here, and the gameplay gate (canPlay) is
  // enforced here too — so EVERY input source is inert when not playable.
  const changeDir = useCallback(
    (nd: Dir) => {
      if (!canPlay) return;
      setNextDir((d) => (isOpposite(d, nd) ? d : nd));
    },
    [canPlay],
  );

  const stopLoop = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  }, []);

  const restart = useCallback(() => {
    stopLoop();

    const startSnake: Cell[] = [
      { x: 9, y: 9 },
      { x: 8, y: 9 },
      { x: 7, y: 9 },
    ];

    setSnake(startSnake);
    setNextDir("right");
    setFood(spawnFood(startSnake));
    setScore(0);
    setNewBest(false);
    setDead(false);
    setPaused(false);
    setRunning(false); // show start screen
  }, [stopLoop]);

  const startGame = useCallback(() => {
    if (!canPlay) return;
    setDead(false);
    setPaused(false);
    setRunning(true);
  }, [canPlay]);

  // Reset + start in one tap (used by the game-over card's "Play again").
  const playAgain = useCallback(() => {
    restart();
    startGame();
  }, [restart, startGame]);

  const togglePause = useCallback(() => {
    if (!running || dead) return;
    setPaused((p) => !p);
  }, [running, dead]);

  function die(finalScore: number) {
    stopLoop();

    setDead(true);
    setRunning(false);
    setPaused(false);

    if (finalScore > best) {
      setNewBest(true);
      setBest(finalScore);
      localStorage.setItem("snake_best", String(finalScore));
    } else {
      setNewBest(false);
    }
  }

  // keyboard controls — fully inert when the game isn't playable.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canPlay) return;

      if (e.key === "ArrowUp") changeDir("up");
      if (e.key === "ArrowDown") changeDir("down");
      if (e.key === "ArrowLeft") changeDir("left");
      if (e.key === "ArrowRight") changeDir("right");

      if (e.key === " ") togglePause();
      if (e.key.toLowerCase() === "r") restart();
      if (e.key.toLowerCase() === "s") startGame();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canPlay, changeDir, togglePause, restart, startGame]);

  // swipe controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let startPt: { x: number; y: number } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (!canPlay) return;
      const t = e.touches[0];
      startPt = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!startPt) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startPt.x;
      const dy = t.clientY - startPt.y;
      startPt = null;

      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (Math.max(ax, ay) < 14) return;

      if (ax > ay) {
        changeDir(dx > 0 ? "right" : "left");
      } else {
        changeDir(dy > 0 ? "down" : "up");
      }
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [canPlay, changeDir]);

  // game loop (controlled single interval, wrap walls, only self kills).
  // !canPlay halts the loop entirely — it never ticks unless playable.
  useEffect(() => {
    if (!running || paused || dead || !canPlay) {
      stopLoop();
      return;
    }

    stopLoop();

    loopRef.current = window.setInterval(() => {
      setSnake((prev) => {
        const d = nextDir;
        const v = dirVec(d);
        const head = prev[0];

        const next: Cell = {
          x: wrap(head.x + v.x),
          y: wrap(head.y + v.y),
        };

        // self collision kills
        if (prev.some((c) => same(c, next))) {
          die(score);
          return prev;
        }

        const ate = same(next, food);
        const newSnake = [next, ...prev];

        if (ate) {
          setScore((s) => s + 1);
          setFood(spawnFood(newSnake));
          return newSnake;
        }

        newSnake.pop();
        return newSnake;
      });
    }, tickMs);

    return () => stopLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, paused, dead, canPlay, nextDir, food, tickMs]);

  // draw (playfield only — all overlays are DOM now)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = CANVAS.boardBg;
    ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);

    ctx.fillStyle = CANVAS.gridDot;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        ctx.fillRect(x * CELL + CELL / 2, y * CELL + CELL / 2, 1, 1);
      }
    }

    ctx.fillStyle = CANVAS.food;
    ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);

    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      ctx.fillStyle = i === 0 ? CANVAS.snakeHead : CANVAS.snakeBody;
      ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
    }
  }, [snake, food]);

  const showStart = !running && !dead;
  const showPaused = paused && running && !dead;

  return (
    <div className="app">
      <header className="appbar">
        <span className="appbar-brand">
          snake<span className="dot">.</span>
        </span>

        <div className="appbar-right">
          {isRegistered && <span className="name-badge" title="your registered player name">{playerName}</span>}
          <ConnectControl />
        </div>
      </header>

      {/* Daily check-in (network-gated): only shown on Base mainnet. On the
          wrong chain the board overlay surfaces the switch action instead. */}
      {isConnected && !isWrongNetwork && (
        <div className="onchain-hud">
          <CheckInPanel />
        </div>
      )}

      <main className="stage-wrap">
        <div className="stage">
          <div className="topbar">
            <div className="stat">
              <span className="stat-num">{score}</span>
              <span className="stat-label">score</span>
            </div>
            <div className="stat">
              <span className="stat-num">{best}</span>
              <span className="stat-label">best</span>
            </div>
            <div className="stat">
              <span className="stat-num">{speed}</span>
              <span className="stat-label">speed</span>
            </div>
          </div>

          <div className="board">
            <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} />

            {/* HARD GATE: until canPlay, the board is covered and the loop +
                all inputs are inert (enforced above). Shows the right state. */}
            {!canPlay ? (
              <div className="overlay">
                <div className="card">
                  {!isConnected ? (
                    <>
                      <div className="overlay-title">connect to play</div>
                      <span className="card-hint">connect a wallet to start playing</span>
                      <ConnectControl />
                    </>
                  ) : isWrongNetwork ? (
                    <>
                      <div className="overlay-title">wrong network</div>
                      <span className="card-hint">switch to Base to play</span>
                      <SwitchNetworkButton />
                    </>
                  ) : (
                    <>
                      <div className="overlay-title">register to play</div>
                      <RegisterName onRegistered={refetchName} />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {showStart && (
                  <div className="overlay">
                    <div className="card">
                      <div className="overlay-title">snake</div>
                      <button className="btn btn-primary" onClick={startGame}>
                        Play
                      </button>
                    </div>
                  </div>
                )}

                {showPaused && (
                  <div className="overlay">
                    <div className="card">
                      <div className="overlay-title">paused</div>
                      <button className="btn btn-primary" onClick={togglePause}>
                        Resume
                      </button>
                    </div>
                  </div>
                )}

                {dead && (
                  <GameOverCard score={score} best={best} newBest={newBest} onPlayAgain={playAgain} />
                )}
              </>
            )}
          </div>

          <div className="controls">
            <button
              className="btn btn-ghost"
              onClick={togglePause}
              disabled={!canPlay || !running || dead}
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button className="btn btn-ghost" onClick={restart} disabled={!canPlay}>
              Restart
            </button>
          </div>

          <DPad onDir={changeDir} disabled={!canPlay} />

          <div className="hint">arrows · swipe · or tap the pad — walls wrap, only self-hits end the run</div>
        </div>
      </main>
    </div>
  );
}
