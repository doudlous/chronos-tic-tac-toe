import React from 'react';
import { X, Layers, Clock, ArrowRight, ShieldCheck, Database } from 'lucide-react';
import { GameEventDoc } from '../types/game';
import { CELL_COORDINATES } from '../game/eventSourcing';

interface EventLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: GameEventDoc[];
  gameId: string;
}

export const EventLogModal: React.FC<EventLogModalProps> = ({
  isOpen,
  onClose,
  events,
  gameId,
}) => {
  if (!isOpen) return null;

  const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                Event Sourcing Audit Log
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {events.length} events
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-md">
                Path: /games/{gameId}/events/*
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info card */}
        <div className="p-4 bg-cyan-950/20 border-b border-slate-800 text-xs text-cyan-200/90 flex items-start gap-2.5">
          <Database className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p>
            <strong>Event Sourcing Pattern:</strong> Every turn and rollback is stored as an immutable, append-only document.
            The current board state is never written directly—it is dynamically reconstructed by replaying this sequential event log.
          </p>
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No events recorded yet. Make the first move!
            </div>
          ) : (
            sortedEvents.map((evt) => {
              const isMove = evt.type === 'MOVE';
              const date =
                evt.createdAt && typeof (evt.createdAt as any).toDate === 'function'
                  ? (evt.createdAt as any).toDate()
                  : evt.createdAt instanceof Date
                  ? evt.createdAt
                  : null;

              return (
                <div
                  key={evt.id}
                  className={`p-3.5 rounded-2xl border transition-colors ${
                    isMove
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      : 'bg-purple-950/30 border-purple-800/60 hover:border-purple-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        #{evt.sequence}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isMove
                            ? evt.player === 'X'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {evt.type}
                      </span>
                      {isMove && (
                        <span className="text-xs text-slate-300 font-medium">
                          Player <span className="font-bold">{evt.player}</span>
                        </span>
                      )}
                    </div>
                    {date && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        {date.toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-300">
                    {isMove ? (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span>Position {evt.position}:</span>
                        <span className="font-semibold text-slate-100">
                          {evt.position !== undefined ? CELL_COORDINATES[evt.position] : 'Unknown'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-purple-300">
                        Restored match state back to Turn #{evt.targetTurnNumber}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                    <span>Doc ID: {evt.id}</span>
                    <span>By: {evt.byUid === 'ai' ? 'Minimax AI' : evt.byUid.slice(0, 10) + '...'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
