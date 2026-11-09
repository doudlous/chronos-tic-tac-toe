import { Timestamp } from 'firebase/firestore';

export type PlayerSymbol = 'X' | 'O';
export type CellValue = PlayerSymbol | null;
export type GameMode = 'ai' | 'pvp';
export type GameStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';
export type GameWinner = 'X' | 'O' | 'draw' | 'none';
export type AiDifficulty = 'easy' | 'medium' | 'unbeatable';

export interface GameDoc {
  id: string;
  gameCode: string;
  mode: GameMode;
  status: GameStatus;
  createdBy: string;
  playerXUid: string;
  playerXName: string;
  playerOUid: string;
  playerOName: string;
  currentTurn: PlayerSymbol;
  winner: GameWinner;
  eventCount: number;
  aiDifficulty?: AiDifficulty;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export type EventType = 'MOVE' | 'ROLLBACK';

export interface GameEventDoc {
  id: string;
  gameId: string;
  sequence: number;
  type: EventType;
  player?: PlayerSymbol | 'none';
  position?: number; // 0..8
  targetTurnNumber?: number;
  byUid: string;
  createdAt: Timestamp | Date;
}

export interface ReplayedTurnSnapshot {
  turnIndex: number; // 0 is initial blank board, 1 is after move 1, etc.
  board: CellValue[];
  lastMove: {
    player: PlayerSymbol;
    position: number;
  } | null;
  currentTurn: PlayerSymbol;
  winner: GameWinner;
  winningLine: number[] | null;
  eventId?: string;
  eventType: EventType;
  description: string;
  byUid: string;
  timestamp?: Date;
}

export interface GameStateFromEvents {
  currentBoard: CellValue[];
  currentTurn: PlayerSymbol;
  winner: GameWinner;
  winningLine: number[] | null;
  turnHistory: ReplayedTurnSnapshot[];
  totalTurns: number;
  activeEventsCount: number;
}
