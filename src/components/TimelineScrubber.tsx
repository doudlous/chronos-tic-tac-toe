import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { ReplayedTurnSnapshot } from '../types/game';

interface TimelineScrubberProps {
  turnHistory: ReplayedTurnSnapshot[];
  selectedTurnIndex: number;
  onSelectTurn: (index: number | ((prev: number) => number)) => void;
  onRollbackToTurn: (turnIndex: number) => Promise<void>;
  liveTurnIndex: number;
  canRollback: boolean;
  isRollbackPending: boolean;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  turnHistory,
  selectedTurnIndex,
  onSelectTurn,
  onRollbackToTurn,
  liveTurnIndex,
  canRollback,
  isRollbackPending,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Auto-play replay walkthrough
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        onSelectTurn((prev: number) => {
          if (prev >= turnHistory.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 950);
    }
    return () => clearInterval(interval);
  }, [isPlaying, turnHistory.length, onSelectTurn]);

  const isHistorical = selectedTurnIndex < liveTurnIndex;
  const currentSnapshot = turnHistory[selectedTurnIndex] || turnHistory[0];

  const handleConfirmRollback = async () => {
    setShowConfirmModal(false);
    await onRollbackToTurn(selectedTurnIndex);
  };

  return (
    <div className="w-full bg-slate-950 border-2 border-slate-800 p-4 pixel-box relative overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b-2 border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="font-pixel-title text-[10px] text-slate-200 tracking-wider">
            REPLAY & TIME-TRAVEL
          </h3>
          <span className="font-pixel-mono text-xs px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300">
            {turnHistory.length - 1} MOVES
          </span>
        </div>

        {/* Live indicator or historical badge */}
        <div>
          {isHistorical ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/80 border border-amber-500/50 text-amber-300 font-pixel-mono text-xs">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>VIEWING T#{selectedTurnIndex} / {liveTurnIndex}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-pixel-mono text-xs">
              <span className="w-2 h-2 bg-emerald-400 animate-ping inline-block" />
              <span>LIVE STATE</span>
            </div>
          )}
        </div>
      </div>

      {/* Description of current selected state */}
      <div className="mb-3 font-pixel-body text-xs text-slate-300 bg-slate-900/90 p-2.5 border border-slate-800 flex items-center justify-between">
        <span className="truncate">
          {currentSnapshot?.description || 'GAME START'}
        </span>
        {currentSnapshot?.eventType === 'ROLLBACK' && (
          <span className="ml-2 shrink-0 px-2 py-0.5 font-pixel-title text-[8px] bg-purple-900 text-purple-200 border border-purple-600">
            REWIND
          </span>
        )}
      </div>

      {/* Scrubber slider */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <input
            type="range"
            min={0}
            max={turnHistory.length - 1}
            value={selectedTurnIndex}
            onChange={(e) => {
              setIsPlaying(false);
              onSelectTurn(Number(e.target.value));
            }}
            className="w-full h-2.5 bg-slate-900 appearance-none cursor-pointer accent-cyan-400 focus:outline-none border border-slate-700"
          />
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1 scrollbar-thin">
          {turnHistory.map((snap, idx) => {
            const isCurrent = idx === selectedTurnIndex;
            const isLive = idx === liveTurnIndex;
            const isRollback = snap.eventType === 'ROLLBACK';

            return (
              <button
                key={idx}
                onClick={() => {
                  setIsPlaying(false);
                  onSelectTurn(idx);
                }}
                className={`
                  shrink-0 px-2.5 py-1 font-pixel-mono text-xs transition-all pixel-btn
                  ${
                    isCurrent
                      ? 'bg-cyan-500 text-slate-950 font-bold scale-105'
                      : isRollback
                      ? 'bg-purple-950 text-purple-300 hover:bg-purple-900'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }
                  ${isLive && !isCurrent ? 'ring-1 ring-emerald-400' : ''}
                `}
                title={snap.description}
              >
                {idx === 0 ? 'START' : isRollback ? `↩ T${snap.turnIndex}` : `T${snap.turnIndex}:${snap.lastMove?.player || ''}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900">
        <div className="flex items-center gap-1.5">
          {/* Skip to Start */}
          <button
            onClick={() => {
              setIsPlaying(false);
              onSelectTurn(0);
            }}
            disabled={selectedTurnIndex === 0}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-40 pixel-btn"
            title="Jump to Start"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Previous Step */}
          <button
            onClick={() => {
              setIsPlaying(false);
              onSelectTurn(Math.max(0, selectedTurnIndex - 1));
            }}
            disabled={selectedTurnIndex === 0}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-40 pixel-btn"
            title="Step Back"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause Replay */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 font-pixel-title text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-200 pixel-btn flex items-center gap-1.5"
            title={isPlaying ? 'Pause Replay' : 'Play Turn Replay'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 text-amber-400" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-cyan-400 fill-current" />
                <span>REPLAY</span>
              </>
            )}
          </button>

          {/* Next Step */}
          <button
            onClick={() => {
              setIsPlaying(false);
              onSelectTurn(Math.min(turnHistory.length - 1, selectedTurnIndex + 1));
            }}
            disabled={selectedTurnIndex === turnHistory.length - 1}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-40 pixel-btn"
            title="Step Forward"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Skip to Live */}
          <button
            onClick={() => {
              setIsPlaying(false);
              onSelectTurn(liveTurnIndex);
            }}
            disabled={selectedTurnIndex === liveTurnIndex}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-40 pixel-btn"
            title="Jump to Current Live Turn"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* RESTORE / ROLLBACK CTA */}
        {isHistorical && canRollback && (
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isRollbackPending}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-pixel-title text-[9px] pixel-btn flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESTORE T#{selectedTurnIndex}</span>
          </button>
        )}
      </div>

      {/* Confirmation Modal for Rollback */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-950 border-4 border-amber-500 p-6 max-w-md w-full pixel-box">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-500/20 text-amber-400 border border-amber-500 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h4 className="font-pixel-title text-xs text-amber-400">
                RESTORE TO TURN #{selectedTurnIndex}?
              </h4>
            </div>

            <p className="font-pixel-body text-xs text-slate-300 mb-4 leading-relaxed">
              This will append a ROLLBACK event to the Firestore stream and restore the board
              back to Turn #{selectedTurnIndex}.
            </p>

            <div className="bg-slate-900 p-3 border-2 border-slate-800 mb-5 text-xs font-pixel-mono text-slate-400">
              <div className="text-slate-200 font-bold mb-1">TARGET STATE:</div>
              <div>Turn: {selectedTurnIndex} ({currentSnapshot?.description})</div>
              <div>Next to move: <span className="text-cyan-400 font-bold">{currentSnapshot?.currentTurn}</span></div>
            </div>

            <div className="flex items-center justify-end gap-3 font-pixel-title text-[9px]">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 pixel-btn"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmRollback}
                disabled={isRollbackPending}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 pixel-btn flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                <span>CONFIRM RESTORE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
