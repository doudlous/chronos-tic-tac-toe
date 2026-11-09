import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import confetti from 'canvas-confetti';
import {
  Share2,
  Layers,
  RotateCcw,
  Trophy,
  Loader2,
  Users,
  Bot,
  ArrowLeft,
  AlertCircle,
  Gamepad2,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  CellValue,
  GameDoc,
  GameEventDoc,
  GameStateFromEvents,
  PlayerSymbol,
} from '../types/game';
import { replayGameEvents } from '../game/eventSourcing';
import { checkWinner, getBestMove } from '../game/minimax';
import { sound } from '../utils/audio';
import { GameBoard } from './GameBoard';
import { TimelineScrubber } from './TimelineScrubber';
import { TurnHistorySidebar } from './TurnHistorySidebar';
import { EventLogModal } from './EventLogModal';
import { ShareModal } from './ShareModal';

interface GameViewProps {
  gameId: string;
  currentUser: User | null;
  onBackToLobby: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  gameId,
  currentUser,
  onBackToLobby,
}) => {
  const [gameDoc, setGameDoc] = useState<GameDoc | null>(null);
  const [events, setEvents] = useState<GameEventDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Time-travel scrubber state
  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number>(0);
  const [isRollbackPending, setIsRollbackPending] = useState<boolean>(false);

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isEventLogOpen, setIsEventLogOpen] = useState<boolean>(false);

  // AI thinking state
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const aiMoveTimeoutRef = useRef<any>(null);

  // Confetti trigger tracker
  const prevWinnerRef = useRef<string | null>(null);

  // 1. Subscribe to Game Document
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribeGame = onSnapshot(
      gameRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setErrorMsg('Game session not found.');
          setLoading(false);
          return;
        }
        const data = snapshot.data() as GameDoc;
        setGameDoc(data);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `games/${gameId}`);
      }
    );

    return () => unsubscribeGame();
  }, [gameId]);

  // 2. Subscribe to Events Subcollection (/games/{gameId}/events)
  useEffect(() => {
    if (!gameId) return;

    const eventsRef = collection(db, 'games', gameId, 'events');
    const unsubscribeEvents = onSnapshot(
      eventsRef,
      (snapshot) => {
        const fetchedEvents: GameEventDoc[] = [];
        snapshot.forEach((docSnap) => {
          fetchedEvents.push(docSnap.data() as GameEventDoc);
        });
        setEvents(fetchedEvents);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `games/${gameId}/events`);
      }
    );

    return () => unsubscribeEvents();
  }, [gameId]);

  // 3. Reconstruct game state dynamically via Event Sourcing!
  const gameState: GameStateFromEvents = React.useMemo(() => {
    return replayGameEvents(events);
  }, [events]);

  // Auto-sync selectedTurnIndex to latest turn if user was previously on live turn
  const liveTurnIndex = gameState.totalTurns;
  const wasAtLiveRef = useRef<boolean>(true);

  useEffect(() => {
    if (wasAtLiveRef.current) {
      setSelectedTurnIndex(liveTurnIndex);
    }
  }, [liveTurnIndex]);

  const handleSelectTurn = (index: number | ((prev: number) => number)) => {
    if (typeof index === 'function') {
      setSelectedTurnIndex((prev) => {
        const next = index(prev);
        wasAtLiveRef.current = next === liveTurnIndex;
        return next;
      });
    } else {
      setSelectedTurnIndex(index);
      wasAtLiveRef.current = index === liveTurnIndex;
    }
  };

  // Determine current active preview snapshot
  const activeSnapshot =
    gameState.turnHistory[
      Math.min(Math.max(0, selectedTurnIndex), gameState.turnHistory.length - 1)
    ] || gameState.turnHistory[0];

  const boardToDisplay = activeSnapshot.board;
  const isHistoricalView = selectedTurnIndex < liveTurnIndex;

  // Determine user's role
  const isPlayerX = currentUser?.uid === gameDoc?.playerXUid;
  const isPlayerO = currentUser?.uid === gameDoc?.playerOUid;
  const mySymbol: PlayerSymbol | null = isPlayerX ? 'X' : isPlayerO ? 'O' : null;
  const isAiOpponent = gameDoc?.mode === 'ai';
  const aiSymbol: PlayerSymbol = isPlayerX ? 'O' : 'X';

  // 4. Trigger celebration confetti on win
  useEffect(() => {
    if (
      gameState.winner &&
      gameState.winner !== 'none' &&
      gameState.winner !== 'draw' &&
      prevWinnerRef.current !== gameState.winner
    ) {
      sound.playWin();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00F0FF', '#FF007F', '#FFE600', '#10B981'],
      });
    }
    prevWinnerRef.current = gameState.winner;
  }, [gameState.winner]);

  // 5. Handle Minimax AI opponent turns (Zero LLM calls)
  useEffect(() => {
    if (!gameDoc || gameDoc.mode !== 'ai' || gameDoc.status !== 'in_progress') return;
    if (gameState.winner !== 'none') return;
    if (isHistoricalView) return;

    const isAiTurn = gameState.currentTurn === aiSymbol;

    if (isAiTurn && !isAiThinking) {
      setIsAiThinking(true);
      if (aiMoveTimeoutRef.current) clearTimeout(aiMoveTimeoutRef.current);

      aiMoveTimeoutRef.current = setTimeout(async () => {
        try {
          const difficulty = gameDoc.aiDifficulty || 'unbeatable';
          const bestMove = getBestMove(gameState.currentBoard, aiSymbol, difficulty);

          if (bestMove !== -1) {
            await commitMoveEvent(bestMove, aiSymbol, 'ai');
          }
        } catch (err) {
          console.error('Error committing AI move:', err);
        } finally {
          setIsAiThinking(false);
        }
      }, 550);
    }

    return () => {
      if (aiMoveTimeoutRef.current) clearTimeout(aiMoveTimeoutRef.current);
    };
  }, [
    gameDoc?.mode,
    gameDoc?.status,
    gameState.currentTurn,
    gameState.winner,
    isHistoricalView,
    aiSymbol,
  ]);

  // Commit a MOVE event to Firestore subcollection
  const commitMoveEvent = async (
    position: number,
    player: PlayerSymbol,
    byUid: string
  ) => {
    if (!gameDoc) return;

    sound.playMove(player);

    const eventSequence = events.length + 1;
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventRef = doc(db, 'games', gameId, 'events', eventId);
    const gameRef = doc(db, 'games', gameId);

    const simulatedBoard = [...gameState.currentBoard];
    simulatedBoard[position] = player;
    const winResult = checkWinner(simulatedBoard);

    let nextTurn: PlayerSymbol = player === 'X' ? 'O' : 'X';
    let nextWinner: 'X' | 'O' | 'draw' | 'none' = 'none';
    let nextStatus = gameDoc.status;

    if (winResult.winner === 'X' || winResult.winner === 'O') {
      nextWinner = winResult.winner;
      nextStatus = 'completed';
    } else if (winResult.winner === 'draw') {
      nextWinner = 'draw';
      nextStatus = 'completed';
    }

    try {
      await setDoc(eventRef, {
        id: eventId,
        gameId,
        sequence: eventSequence,
        type: 'MOVE',
        player,
        position,
        byUid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(gameRef, {
        currentTurn: nextTurn,
        winner: nextWinner,
        status: nextStatus,
        eventCount: eventSequence,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `games/${gameId}/events/${eventId}`);
    }
  };

  // User clicks a board cell
  const handleCellClick = async (position: number) => {
    if (!currentUser || !mySymbol || !gameDoc) return;
    if (gameDoc.status !== 'in_progress') return;
    if (gameState.currentTurn !== mySymbol) return;
    if (gameState.currentBoard[position] !== null) return;
    if (isHistoricalView) return;

    await commitMoveEvent(position, mySymbol, currentUser.uid);
  };

  // Roll back to a historical turn
  const handleRollback = async (targetTurnIndex: number) => {
    if (!currentUser || !gameDoc) return;

    setIsRollbackPending(true);
    sound.playRollback();

    const targetSnapshot = gameState.turnHistory[targetTurnIndex];
    const eventSequence = events.length + 1;
    const eventId = `evt_${Date.now()}_rb_${Math.random().toString(36).substring(2, 7)}`;
    const eventRef = doc(db, 'games', gameId, 'events', eventId);
    const gameRef = doc(db, 'games', gameId);

    try {
      await setDoc(eventRef, {
        id: eventId,
        gameId,
        sequence: eventSequence,
        type: 'ROLLBACK',
        targetTurnNumber: targetTurnIndex,
        byUid: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(gameRef, {
        currentTurn: targetSnapshot.currentTurn,
        winner: targetSnapshot.winner,
        status: targetSnapshot.winner !== 'none' ? 'completed' : 'in_progress',
        eventCount: eventSequence,
        updatedAt: serverTimestamp(),
      });

      wasAtLiveRef.current = true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `games/${gameId}/events/${eventId}`);
    } finally {
      setIsRollbackPending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="font-pixel-title text-xs text-slate-400">LOADING ARCADE REPLAY...</p>
      </div>
    );
  }

  if (errorMsg || !gameDoc) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-slate-950 border-4 border-slate-800 pixel-box text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="font-pixel-title text-sm text-slate-100">MATCH UNAVAILABLE</h3>
        <p className="font-pixel-body text-xs text-slate-400">{errorMsg || 'Could not load match data.'}</p>
        <button
          onClick={onBackToLobby}
          className="px-4 py-2 bg-slate-900 text-slate-200 pixel-btn font-pixel-title text-[9px]"
        >
          RETURN TO LOBBY
        </button>
      </div>
    );
  }

  const isWaitingOpponent = gameDoc.status === 'waiting' && gameDoc.mode === 'pvp';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Arcade Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border-2 border-slate-800 p-3 pixel-box">
        <button
          onClick={onBackToLobby}
          className="px-3 py-1.5 font-pixel-title text-[9px] text-slate-300 hover:text-slate-100 bg-slate-900 pixel-btn flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>LOBBY</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-pixel-title text-[9px] px-2.5 py-1 bg-slate-900 border border-slate-700 text-cyan-400">
            ROOM: {gameDoc.gameCode}
          </span>
          {gameDoc.mode === 'pvp' && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-1 font-pixel-title text-[9px] bg-cyan-950 border border-cyan-700 text-cyan-300 pixel-btn flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>INVITE CODE</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setIsEventLogOpen(true)}
          className="px-3 py-1.5 font-pixel-title text-[9px] text-amber-300 bg-amber-950 border border-amber-700 pixel-btn flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>EVENTS ({events.length})</span>
        </button>
      </div>

      {/* 2-Column Responsive Layout: Left: Game Arena / Board, Right: Turn History Sidebar */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Main Game Arena Column */}
        <div className="flex-1 w-full space-y-5">
          {/* Players Header Card */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Player X */}
            <div
              className={`p-3.5 sm:p-4 border-2 transition-all pixel-box ${
                gameState.currentTurn === 'X' && gameDoc.status === 'in_progress'
                  ? 'bg-cyan-950/70 border-cyan-400 shadow-[2px_2px_0px_#06b6d4]'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 bg-cyan-500/20 text-cyan-400 font-pixel-title flex items-center justify-center text-xs border-2 border-cyan-500/50">
                  X
                </span>
                {gameState.currentTurn === 'X' && gameDoc.status === 'in_progress' && (
                  <span className="font-pixel-title text-[8px] text-cyan-400 animate-pulse">
                    YOUR TURN
                  </span>
                )}
              </div>
              <div className="font-pixel-body text-xs font-bold text-slate-100 truncate">
                {gameDoc.playerXName}
              </div>
              <div className="font-pixel-mono text-xs text-slate-400">
                {isPlayerX ? '(YOU)' : 'OPPONENT'}
              </div>
            </div>

            {/* Player O */}
            <div
              className={`p-3.5 sm:p-4 border-2 transition-all pixel-box ${
                gameState.currentTurn === 'O' && gameDoc.status === 'in_progress'
                  ? 'bg-rose-950/70 border-rose-400 shadow-[2px_2px_0px_#f43f5e]'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 bg-rose-500/20 text-rose-400 font-pixel-title flex items-center justify-center text-xs border-2 border-rose-500/50">
                  O
                </span>
                {gameState.currentTurn === 'O' && gameDoc.status === 'in_progress' && (
                  <span className="font-pixel-title text-[8px] text-rose-400 animate-pulse">
                    {isAiThinking ? 'CPU THINKING...' : 'TURN'}
                  </span>
                )}
              </div>
              <div className="font-pixel-body text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
                {gameDoc.mode === 'ai' ? (
                  <>
                    <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>CPU MINIMAX</span>
                  </>
                ) : gameDoc.playerOName ? (
                  <span>{gameDoc.playerOName}</span>
                ) : (
                  <span className="text-amber-400">WAITING...</span>
                )}
              </div>
              <div className="font-pixel-mono text-xs text-slate-400">
                {isPlayerO ? '(YOU)' : isAiOpponent ? `AI (${gameDoc.aiDifficulty})` : 'PLAYER O'}
              </div>
            </div>
          </div>

          {/* Match Status Banner */}
          <div className="text-center py-1">
            {isWaitingOpponent ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-950/90 border-2 border-amber-500 pixel-box text-amber-300 font-pixel-body text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>WAITING FOR FRIEND. CODE: <strong>{gameDoc.gameCode}</strong></span>
              </div>
            ) : gameState.winner !== 'none' ? (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950 border-4 border-amber-400 pixel-box-cyan text-slate-100 font-pixel-title text-xs shadow-xl animate-bounce">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>
                  {gameState.winner === 'draw'
                    ? 'STALEMATE DRAW!'
                    : `PLAYER ${gameState.winner} WINS!`}
                </span>
              </div>
            ) : (
              <div className="font-pixel-body text-xs">
                {isHistoricalView ? (
                  <span className="text-amber-400 font-bold">
                    [HISTORICAL PREVIEW] BOARD AT TURN #{selectedTurnIndex}
                  </span>
                ) : gameState.currentTurn === mySymbol ? (
                  <span className="text-cyan-400 font-bold flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-cyan-400 animate-ping inline-block" />
                    YOUR TURN TO PLACE {mySymbol}!
                  </span>
                ) : (
                  <span className="text-slate-400">
                    WAITING FOR {isAiOpponent ? 'CPU MINIMAX' : 'OPPONENT'} TO MOVE...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 3x3 Retro Pixel Game Board */}
          <GameBoard
            board={boardToDisplay}
            onCellClick={handleCellClick}
            disabled={gameDoc.status !== 'in_progress' || gameState.winner !== 'none'}
            mySymbol={mySymbol}
            currentTurn={gameState.currentTurn}
            winningLine={activeSnapshot.winningLine}
            winner={activeSnapshot.winner}
            isHistoricalView={isHistoricalView}
          />

          {/* Retro Event Sourcing Timeline Scrubber */}
          <TimelineScrubber
            turnHistory={gameState.turnHistory}
            selectedTurnIndex={selectedTurnIndex}
            onSelectTurn={handleSelectTurn}
            onRollbackToTurn={handleRollback}
            liveTurnIndex={liveTurnIndex}
            canRollback={Boolean(currentUser && (isPlayerX || isPlayerO))}
            isRollbackPending={isRollbackPending}
          />
        </div>

        {/* Turn History Sidebar (Matching current state replay with timestamps & actors) */}
        <TurnHistorySidebar
          turnHistory={gameState.turnHistory}
          selectedTurnIndex={selectedTurnIndex}
          liveTurnIndex={liveTurnIndex}
          onSelectTurn={handleSelectTurn}
          onRollbackToTurn={handleRollback}
          gameDoc={gameDoc}
          canRollback={Boolean(currentUser && (isPlayerX || isPlayerO))}
          isRollbackPending={isRollbackPending}
        />
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        gameCode={gameDoc.gameCode}
        isWaitingForOpponent={isWaitingOpponent}
      />

      <EventLogModal
        isOpen={isEventLogOpen}
        onClose={() => setIsEventLogOpen(false)}
        events={events}
        gameId={gameId}
      />
    </div>
  );
};
