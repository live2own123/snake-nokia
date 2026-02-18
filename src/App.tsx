import { useEffect, useMemo, useRef, useState } from "react";

type Cell = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";

const GRID = 18;
const CELL = 20;

// Base-ish blue theme
const BG = "#0A1020";
const PANEL = "#0B1634";
const BORDER = "rgba(255,255,255,0.10)";
const GRID_DOT = "rgba(255,255,255,0.10)";
const SNAKE_HEAD = "#EAF2FF";
const SNAKE_BODY = "#9DB6FF";
const FOOD = "#3B82F6";
const TEXT_MUTED = "rgba(255,255,255,0.75)";

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

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loopRef = useRef<number | null>(null);

  const [snake, setSnake] = useState<Cell[]>([
    { x: 9, y: 9 },
    { x: 8, y: 9 },
    { x: 7, y: 9 },
  ]);

  const [dir, setDir] = useState<Dir>("right");
  const [nextDir, setNextDir] = useState<Dir>("right");
  const [food, setFood] = useState<Cell>({ x: 4, y: 6 });

  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem("snake_best") || 0));

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dead, setDead] = useState(false);

  const speed = useMemo(() => {
    const base = 9;
    const bonus = Math.floor(score / 5) * 2;
    return base + bonus;
  }, [score]);

  const tickMs = useMemo(() => Math.max(55, Math.floor(1000 / speed)), [speed]);

  function spawnFood(s: Cell[]) {
    while (true) {
      const f = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
      if (!s.some((c) => same(c, f))) return f;
    }
  }

  function stopLoop() {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  }

  function restart() {
    stopLoop();

    const startSnake = [
      { x: 9, y: 9 },
      { x: 8, y: 9 },
      { x: 7, y: 9 },
    ];

    setSnake(startSnake);
    setDir("right");
    setNextDir("right");
    setFood(spawnFood(startSnake));
    setScore(0);
    setDead(false);
    setPaused(false);
    setRunning(false); // show start screen
  }

  function startGame() {
    setDead(false);
    setPaused(false);
    setRunning(true);
  }

  function togglePause() {
    if (!running || dead) return;
    setPaused((p) => !p);
  }

  function die(finalScore: number) {
    stopLoop();

    setDead(true);
    setRunning(false);
    setPaused(false);

    if (finalScore > best) {
      setBest(finalScore);
      localStorage.setItem("snake_best", String(finalScore));
    }
  }

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") setNextDir((d) => (isOpposite(d, "up") ? d : "up"));
      if (e.key === "ArrowDown") setNextDir((d) => (isOpposite(d, "down") ? d : "down"));
      if (e.key === "ArrowLeft") setNextDir((d) => (isOpposite(d, "left") ? d : "left"));
      if (e.key === "ArrowRight") setNextDir((d) => (isOpposite(d, "right") ? d : "right"));

      if (e.key === " ") togglePause();
      if (e.key.toLowerCase() === "r") restart();
      if (e.key.toLowerCase() === "s") startGame();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dead, running]);

  // swipe controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let startPt: { x: number; y: number } | null = null;

    const onTouchStart = (e: TouchEvent) => {
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
        setNextDir((d) => {
          const nd: Dir = dx > 0 ? "right" : "left";
          return isOpposite(d, nd) ? d : nd;
        });
      } else {
        setNextDir((d) => {
          const nd: Dir = dy > 0 ? "down" : "up";
          return isOpposite(d, nd) ? d : nd;
        });
      }
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // game loop (controlled single interval, wrap walls, only self kills)
  useEffect(() => {
    if (!running || paused || dead) {
      stopLoop();
      return;
    }

    stopLoop();

    loopRef.current = window.setInterval(() => {
      setSnake((prev) => {
        const d = nextDir;
        setDir(d);

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
  }, [running, paused, dead, nextDir, food, tickMs]);

  // draw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);

    ctx.fillStyle = GRID_DOT;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        ctx.fillRect(x * CELL + CELL / 2, y * CELL + CELL / 2, 1, 1);
      }
    }

    ctx.fillStyle = FOOD;
    ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);

    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      ctx.fillStyle = i === 0 ? SNAKE_HEAD : SNAKE_BODY;
      ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
    }

    if (!running && !dead) overlay(ctx, "snake", "press start");
    if (paused && running && !dead) overlay(ctx, "paused", "space to resume");
    if (dead) overlay(ctx, "game over", "press restart");
  }, [snake, food, paused, dead, running]);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "white", display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(560px, 92vw)", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18, textTransform: "lowercase" }}>snake</h2>
          <div style={{ color: TEXT_MUTED, fontSize: 14 }}>
            score: {score} | best: {best} | speed: {speed}
          </div>
        </div>

        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 12 }}>
          <canvas
            ref={canvasRef}
            width={GRID * CELL}
            height={GRID * CELL}
            style={{
              width: "100%",
              height: "auto",
              borderRadius: 14,
              border: `1px solid ${BORDER}`,
              touchAction: "none",
              background: "#050B18",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button style={btnStyle} onClick={startGame} disabled={running && !dead}>
            start
          </button>

          <button style={btnStyle} onClick={togglePause} disabled={!running || dead}>
            {paused ? "resume" : "pause"}
          </button>

          <button style={btnStyle} onClick={restart}>
            restart
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 13, color: TEXT_MUTED }}>
          controls: arrows or swipe | s: start | space: pause | r: restart | walls wrap | only self hit kills
        </div>
      </div>
    </div>
  );
}

function overlay(ctx: CanvasRenderingContext2D, title: string, subtitle: string) {
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#EAF2FF";
  ctx.font = "700 24px system-ui";
  ctx.fillText(title, ctx.canvas.width / 2, ctx.canvas.height / 2 - 6);
  ctx.font = "14px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(subtitle, ctx.canvas.width / 2, ctx.canvas.height / 2 + 18);
}

const btnStyle: React.CSSProperties = {
  flex: 1,
  background: "#0B2A66",
  color: "white",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
};
