import React from 'react';
import {
  Clock,
  RotateCcw,
  User,
  Bot,
  Layers,
  ChevronRight,
  Play,
} from 'lucide-react';
import { GameDoc, ReplayedTurnSnapshot } from '../types/game';
import { CELL_COORDINATES } from '../game/eventSourcing';

interface TurnHistorySidebarProps {
  turnHistory: ReplayedTurnSnapshot[];
  selectedTurnIndex: number;
  liveTurnIndex: number;
  onSelectTurn: (index: number) => void;
  onRollbackToTurn: (index: number) => Promise<void>;
  gameDoc: GameDoc;
  canRollback: boolean;
  isRollbackPending: boolean;
}

export const TurnHistorySidebar: React.FC<TurnHistorySidebarProps> = ({
  turnHistory,
  selectedTurnIndex,
  liveTurnIndex,
  onSelectTurn,
  onRollbackToTurn,
  gameDoc,
  canRollback,
  isRollbackPending,
}) => {
  return (
    <aside className="w-full lg:w-80 flex flex-col bg-slate-950/90 border-2 border-slate-800 rounded-none pixel-box relative overflow-hidden">
      {/* Top Arcade Header */}
      <div className="p-3.5 bg-slate-900 border-b-2 border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="font-pixel-title text-[10px] tracking-wider text-slate-100">
            TURN HISTORY
          </h3>
        </div>
        <span className="font-pixel-mono text-sm px-2 py-0.5 bg-slate-950 text-cyan-400 border border-slate-700">
          {turnHistory.length - 1} MOVES
        </span>
      </div>

      {/* Subheader / Live Status */}
      <div className="px-3.5 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] font-pixel-body flex items-center justify-between text-slate-400">
        <span>CURRENT STATE REPLAY</span>
        {selectedTurnIndex < liveTurnIndex ? (
          <span className="text-amber-400 flex items-center gap-1 font-bold">
            <span className="inline-block w-1.5 h-1.5 bg-amber-400 animate-ping" />
            PREVIEW T{selectedTurnIndex}
          </span>
        ) : (
          <span className="text-emerald-400 flex items-center gap-1 font-bold">
            <span className="inline-block w-1.5 h-1.5 bg-emerald-400" />
            LIVE
          </span>
        )}
      </div>

      {/* Scrollable Turn List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[460px] lg:max-h-[580px] scrollbar-thin">
        {turnHistory.map((snap, idx) => {
          const isSelected = idx === selectedTurnIndex;
          const isLive = idx === liveTurnIndex;
          const isRollback = snap.eventType === 'ROLLBACK';
          const isStart = idx === 0;

          // Resolve who made this move
          let actorName = 'SYSTEM';
          let isAi = false;
          let actorSymbol = snap.lastMove?.player || snap.currentTurn;

          if (isStart) {
            actorName = 'GAME START';
          } else if (snap.byUid === 'ai') {
            actorName = 'MINIMAX CPU';
            isAi = true;
          } else if (snap.byUid === gameDoc.playerXUid) {
            actorName = gameDoc.playerXName || 'PLAYER X';
            actorSymbol = 'X';
          } else if (snap.byUid === gameDoc.playerOUid) {
            actorName = gameDoc.playerOName || 'PLAYER O';
            actorSymbol = 'O';
          } else {
            actorName = snap.byUid ? snap.byUid.slice(0, 10) : 'PLAYER';
          }

          const timeString = snap.timestamp
            ? snap.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : null;

          return (
            <div
              key={idx}
              onClick={() => onSelectTurn(idx)}
              className={`
                p-2.5 cursor-pointer transition-all border-2 select-none relative
                ${
                  isSelected
                    ? isRollback
                      ? 'bg-purple-950/80 border-purple-500 shadow-[2px_2px_0px_#9333ea]'
                      : 'bg-cyan-950/80 border-cyan-400 shadow-[2px_2px_0px_#06b6d4]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }
              `}
            >
              {/* Row 1: Turn Number & Player Badge */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-pixel-title text-[9px] ${
                      isSelected ? 'text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    {isStart ? 'START' : `T#${String(idx).padStart(2, '0')}`}
                  </span>

                  {!isStart && !isRollback && (
                    <span
                      className={`font-pixel-title text-[10px] px-1.5 py-0.5 ${
                        actorSymbol === 'X'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {actorSymbol}
                    </span>
                  )}

                  {isRollback && (
                    <span className="font-pixel-title text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      REWIND
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                {timeString && (
                  <div className="flex items-center gap-1 font-pixel-mono text-xs text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{timeString}</span>
                  </div>
                )}
              </div>

              {/* Row 2: Actor & Move coordinates */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0 font-pixel-body text-slate-200 truncate">
                  {isAi ? (
                    <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate text-[11px] font-semibold">{actorName}</span>
                </div>

                {snap.lastMove && (
                  <span className="font-pixel-mono text-xs text-amber-300 shrink-0">
                    POS: {snap.lastMove.position + 1}
                  </span>
                )}
              </div>

              {/* Row 3: Mini 3x3 Grid Preview of this turn */}
              {!isStart && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="truncate max-w-[180px]">
                    {isRollback
                      ? `Restored to Turn ${snap.turnIndex}`
                      : snap.lastMove?.position !== undefined
                      ? CELL_COORDINATES[snap.lastMove.position].split(' (')[0]
                      : ''}
                  </span>

                  {/* Micro 3x3 Preview */}
                  <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-slate-950 border border-slate-800 shrink-0">
                    {snap.board.map((cell, cIdx) => (
                      <div
                        key={cIdx}
                        className={`w-2.5 h-2.5 flex items-center justify-center text-[7px] font-pixel-title ${
                          snap.lastMove?.position === cIdx
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : cell === 'X'
                            ? 'bg-cyan-950 text-cyan-400'
                            : cell === 'O'
                            ? 'bg-rose-950 text-rose-400'
                            : 'bg-slate-900'
                        }`}
                      >
                        {cell || ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active selection arrow */}
              {isSelected && (
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rotate-45 pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Rollback Quick Action if viewing past turn */}
      {selectedTurnIndex < liveTurnIndex && canRollback && (
        <div className="p-3 bg-slate-900 border-t-2 border-slate-800">
          <button
            onClick={() => onRollbackToTurn(selectedTurnIndex)}
            disabled={isRollbackPending}
            className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-pixel-title text-[9px] tracking-wider pixel-btn flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTORE TO T#{selectedTurnIndex}</span>
          </button>
        </div>
      )}
    </aside>
  );
};
