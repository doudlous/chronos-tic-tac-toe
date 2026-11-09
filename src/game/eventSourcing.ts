import {
  CellValue,
  GameEventDoc,
  GameStateFromEvents,
  PlayerSymbol,
  ReplayedTurnSnapshot,
} from '../types/game';
import { checkWinner } from './minimax';

export const CELL_COORDINATES: Record<number, string> = {
  0: 'Top-Left (Row 1, Col 1)',
  1: 'Top-Center (Row 1, Col 2)',
  2: 'Top-Right (Row 1, Col 3)',
  3: 'Middle-Left (Row 2, Col 1)',
  4: 'Center (Row 2, Col 2)',
  5: 'Middle-Right (Row 2, Col 3)',
  6: 'Bottom-Left (Row 3, Col 1)',
  7: 'Bottom-Center (Row 3, Col 2)',
  8: 'Bottom-Right (Row 3, Col 3)',
};

/**
 * Replays all events from the event-sourcing subcollection to reconstruct
 * the exact current state and the full historic snapshots of the game.
 */
export function replayGameEvents(events: GameEventDoc[]): GameStateFromEvents {
  // Sort events chronologically by sequence
  const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);

  // Initial pristine state
  let board: CellValue[] = Array(9).fill(null);
  let currentTurn: PlayerSymbol = 'X';
  let winner: 'X' | 'O' | 'draw' | 'none' = 'none';
  let winningLine: number[] | null = null;

  // Turn 0 is initial empty board
  const turnHistory: ReplayedTurnSnapshot[] = [
    {
      turnIndex: 0,
      board: Array(9).fill(null),
      lastMove: null,
      currentTurn: 'X',
      winner: 'none',
      winningLine: null,
      eventType: 'MOVE',
      description: 'Game Started (Empty Board)',
      byUid: 'system',
    },
  ];

  for (const event of sortedEvents) {
    if (event.type === 'MOVE') {
      const position = event.position ?? -1;
      const movePlayer: PlayerSymbol = (event.player as PlayerSymbol) || currentTurn;

      if (position >= 0 && position < 9) {
        board = [...board];
        board[position] = movePlayer;

        const winResult = checkWinner(board);
        if (winResult.winner === 'X' || winResult.winner === 'O') {
          winner = winResult.winner;
          winningLine = winResult.line;
        } else if (winResult.winner === 'draw') {
          winner = 'draw';
          winningLine = null;
        } else {
          winner = 'none';
          winningLine = null;
          currentTurn = movePlayer === 'X' ? 'O' : 'X';
        }

        const date =
          event.createdAt && typeof (event.createdAt as any).toDate === 'function'
            ? (event.createdAt as any).toDate()
            : event.createdAt instanceof Date
            ? event.createdAt
            : undefined;

        turnHistory.push({
          turnIndex: turnHistory.length,
          board: [...board],
          lastMove: { player: movePlayer, position },
          currentTurn,
          winner,
          winningLine,
          eventId: event.id,
          eventType: 'MOVE',
          description: `Turn ${turnHistory.length}: Player ${movePlayer} moved to ${CELL_COORDINATES[position]}`,
          byUid: event.byUid,
          timestamp: date,
        });
      }
    } else if (event.type === 'ROLLBACK') {
      const target = event.targetTurnNumber ?? 0;
      const targetSnapshot =
        turnHistory[Math.min(Math.max(0, target), turnHistory.length - 1)];

      board = [...targetSnapshot.board];
      currentTurn = targetSnapshot.currentTurn;
      winner = targetSnapshot.winner;
      winningLine = targetSnapshot.winningLine;

      const date =
        event.createdAt && typeof (event.createdAt as any).toDate === 'function'
          ? (event.createdAt as any).toDate()
          : event.createdAt instanceof Date
          ? event.createdAt
          : undefined;

      turnHistory.push({
        turnIndex: turnHistory.length,
        board: [...board],
        lastMove: null,
        currentTurn,
        winner,
        winningLine,
        eventId: event.id,
        eventType: 'ROLLBACK',
        description: `Rollback applied: Restored board state back to Turn ${target}`,
        byUid: event.byUid,
        timestamp: date,
      });
    }
  }

  return {
    currentBoard: board,
    currentTurn,
    winner,
    winningLine,
    turnHistory,
    totalTurns: turnHistory.length - 1,
    activeEventsCount: sortedEvents.length,
  };
}
