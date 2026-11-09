import { CellValue, PlayerSymbol } from '../types/game';

export const WINNING_COMBINATIONS = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left col
  [1, 4, 7], // middle col
  [2, 5, 8], // right col
  [0, 4, 8], // diagonal top-left to bottom-right
  [2, 4, 6], // diagonal top-right to bottom-left
];

export function checkWinner(board: CellValue[]): {
  winner: PlayerSymbol | 'draw' | null;
  line: number[] | null;
} {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: combo };
    }
  }

  const isFull = board.every((cell) => cell !== null);
  if (isFull) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
}

export function getAvailableMoves(board: CellValue[]): number[] {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      moves.push(i);
    }
  }
  return moves;
}

/**
 * Minimax recursive algorithm with alpha-beta pruning.
 * Guarantees mathematically optimal play when maximizing.
 */
function minimax(
  board: CellValue[],
  depth: number,
  isMaximizing: boolean,
  aiSymbol: PlayerSymbol,
  humanSymbol: PlayerSymbol,
  alpha: number,
  beta: number
): number {
  const result = checkWinner(board);
  if (result.winner === aiSymbol) {
    return 10 - depth;
  }
  if (result.winner === humanSymbol) {
    return depth - 10;
  }
  if (result.winner === 'draw') {
    return 0;
  }

  const availableMoves = getAvailableMoves(board);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of availableMoves) {
      board[move] = aiSymbol;
      const evaluation = minimax(board, depth + 1, false, aiSymbol, humanSymbol, alpha, beta);
      board[move] = null;
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of availableMoves) {
      board[move] = humanSymbol;
      const evaluation = minimax(board, depth + 1, true, aiSymbol, humanSymbol, alpha, beta);
      board[move] = null;
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/**
 * Returns the best move for the AI opponent based on the selected difficulty.
 * Simple algorithm: Minimax (with optional heuristic randomness for lower difficulties).
 * Zero calls to any LLM.
 */
export function getBestMove(
  board: CellValue[],
  aiSymbol: PlayerSymbol,
  difficulty: 'easy' | 'medium' | 'unbeatable' = 'unbeatable'
): number {
  const availableMoves = getAvailableMoves(board);
  if (availableMoves.length === 0) return -1;

  const humanSymbol: PlayerSymbol = aiSymbol === 'X' ? 'O' : 'X';

  // Easy: Mostly random moves with small chance of best move
  if (difficulty === 'easy') {
    const pickRandom = Math.random() < 0.75;
    if (pickRandom) {
      const randomIndex = Math.floor(Math.random() * availableMoves.length);
      return availableMoves[randomIndex];
    }
  }

  // Medium: Smart heuristic (takes immediate win, blocks opponent immediate win, else 50% minimax)
  if (difficulty === 'medium') {
    // Check immediate win
    for (const move of availableMoves) {
      board[move] = aiSymbol;
      if (checkWinner(board).winner === aiSymbol) {
        board[move] = null;
        return move;
      }
      board[move] = null;
    }

    // Check immediate block
    for (const move of availableMoves) {
      board[move] = humanSymbol;
      if (checkWinner(board).winner === humanSymbol) {
        board[move] = null;
        return move;
      }
      board[move] = null;
    }

    if (Math.random() < 0.35) {
      // Pick center if free, or corner
      if (board[4] === null) return 4;
      const corners = [0, 2, 6, 8].filter((c) => board[c] === null);
      if (corners.length > 0) {
        return corners[Math.floor(Math.random() * corners.length)];
      }
    }
  }

  // Unbeatable (or fallback for medium/easy): Full Minimax search
  let bestScore = -Infinity;
  let bestMoves: number[] = [];

  for (const move of availableMoves) {
    board[move] = aiSymbol;
    const score = minimax(board, 0, false, aiSymbol, humanSymbol, -Infinity, Infinity);
    board[move] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  // If multiple moves have identical optimal score, choose one at random for play variety
  const chosenIndex = Math.floor(Math.random() * bestMoves.length);
  return bestMoves[chosenIndex];
}
