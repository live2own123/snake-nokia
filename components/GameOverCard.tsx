// DOM game-over card rendered as an overlay above the canvas (not drawn on it).
// The on-chain actions (save score / mint / claim) live in <GameOverActions>,
// wired to the Base mainnet contracts.
import { GameOverActions } from "./onchain/GameOverActions";

export default function GameOverCard({
  score,
  best,
  newBest,
  onPlayAgain,
}: {
  score: number;
  best: number;
  newBest: boolean;
  onPlayAgain: () => void;
}) {
  return (
    <div className="overlay">
      <div className="card" role="dialog" aria-label="game over">
        <div className="card-kicker">game over</div>

        <div className="card-scores">
          <div className="score-block">
            <span className="score-num">{score}</span>
            <span className="score-label">score</span>
          </div>
          <div className="score-block">
            <span className="score-num">{best}</span>
            <span className="score-label">best</span>
          </div>
        </div>

        {newBest && <div className="card-badge">new best!</div>}

        <GameOverActions finalScore={score} />

        <button className="btn btn-primary" onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}
