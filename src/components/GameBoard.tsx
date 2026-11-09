import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CellValue, PlayerSymbol } from '../types/game';

interface GameBoardProps {
  board: CellValue[];
  onCellClick: (index: number) => void;
  disabled: boolean;
  mySymbol: PlayerSymbol | null;
  currentTurn: PlayerSymbol;
  winningLine: number[] | null;
  winner: string | null;
  isHistoricalView: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  onCellClick,
  disabled,
  mySymbol,
  currentTurn,
  winningLine,
  winner,
  isHistoricalView,
}) => {
  const isMyTurn = !disabled && mySymbol === currentTurn && !isHistoricalView;

  return (
    <div className="relative w-full max-w-[360px] sm:max-w-[440px] aspect-square mx-auto p-3.5 sm:p-5 bg-slate-950 border-4 border-slate-800 pixel-box relative overflow-hidden select-none">
      {/* Subtle CRT Scanlines & Pixel Grid */}
      <div className="absolute inset-0 crt-scanlines pointer-events-none z-10 opacity-40" />
      <div className="absolute inset-0 pixel-grid-pattern pointer-events-none opacity-20" />

      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full h-full relative z-20">
        {board.map((cellValue, idx) => {
          const isWinningCell = winningLine?.includes(idx);
          const isCellEmpty = cellValue === null;
          const canClick = isMyTurn && isCellEmpty;

          return (
            <button
              key={idx}
              onClick={() => {
                if (canClick) {
                  onCellClick(idx);
                }
              }}
              disabled={!canClick}
              aria-label={`Grid Cell ${idx + 1}`}
              className={`
                relative flex items-center justify-center transition-transform duration-75 outline-none
                ${
                  isWinningCell
                    ? 'bg-amber-950/80 border-2 border-amber-400 pixel-cell-winning animate-pulse'
                    : 'bg-slate-900 border-2 border-slate-700/80 pixel-cell'
                }
                ${canClick ? 'cursor-pointer hover:bg-slate-800 active:translate-y-1' : 'cursor-default'}
                ${isHistoricalView ? 'opacity-90' : ''}
              `}
            >
              {/* Retro Pixel Coordinate tag in corner */}
              <span className="absolute top-1 left-1.5 font-pixel-mono text-xs text-slate-500/80 select-none">
                {idx + 1}
              </span>

              {/* Render 8-Bit Pixel X */}
              <AnimatePresence>
                {cellValue === 'X' && (
                  <motion.svg
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.2, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                    viewBox="0 0 10 10"
                    shapeRendering="crispEdges"
                    className="w-14 h-14 sm:w-18 sm:h-18 text-cyan-400 drop-shadow-[2px_2px_0px_#083344]"
                  >
                    {/* Authentic 8-bit Blocky Cross */}
                    <rect x="1" y="1" width="2" height="2" fill="currentColor" />
                    <rect x="7" y="1" width="2" height="2" fill="currentColor" />
                    <rect x="2" y="2" width="2" height="2" fill="currentColor" />
                    <rect x="6" y="2" width="2" height="2" fill="currentColor" />
                    <rect x="3" y="3" width="2" height="2" fill="currentColor" />
                    <rect x="5" y="3" width="2" height="2" fill="currentColor" />
                    <rect x="4" y="4" width="2" height="2" fill="currentColor" />
                    <rect x="3" y="5" width="2" height="2" fill="currentColor" />
                    <rect x="5" y="5" width="2" height="2" fill="currentColor" />
                    <rect x="2" y="6" width="2" height="2" fill="currentColor" />
                    <rect x="6" y="6" width="2" height="2" fill="currentColor" />
                    <rect x="1" y="7" width="2" height="2" fill="currentColor" />
                    <rect x="7" y="7" width="2" height="2" fill="currentColor" />
                  </motion.svg>
                )}
              </AnimatePresence>

              {/* Render 8-Bit Pixel O */}
              <AnimatePresence>
                {cellValue === 'O' && (
                  <motion.svg
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.2, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                    viewBox="0 0 10 10"
                    shapeRendering="crispEdges"
                    className="w-14 h-14 sm:w-18 sm:h-18 text-rose-400 drop-shadow-[2px_2px_0px_#4c0519]"
                  >
                    {/* Authentic 8-bit Octagonal Pixel Ring */}
                    <rect x="3" y="1" width="4" height="2" fill="currentColor" />
                    <rect x="3" y="7" width="4" height="2" fill="currentColor" />
                    <rect x="1" y="3" width="2" height="4" fill="currentColor" />
                    <rect x="7" y="3" width="2" height="4" fill="currentColor" />
                    <rect x="2" y="2" width="2" height="2" fill="currentColor" />
                    <rect x="6" y="2" width="2" height="2" fill="currentColor" />
                    <rect x="2" y="6" width="2" height="2" fill="currentColor" />
                    <rect x="6" y="6" width="2" height="2" fill="currentColor" />
                  </motion.svg>
                )}
              </AnimatePresence>

              {/* Ghost preview on hover */}
              {canClick && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-25 transition-opacity pointer-events-none">
                  {mySymbol === 'X' ? (
                    <svg viewBox="0 0 10 10" shapeRendering="crispEdges" className="w-12 h-12 text-cyan-400">
                      <rect x="1" y="1" width="2" height="2" fill="currentColor" />
                      <rect x="7" y="1" width="2" height="2" fill="currentColor" />
                      <rect x="2" y="2" width="2" height="2" fill="currentColor" />
                      <rect x="6" y="2" width="2" height="2" fill="currentColor" />
                      <rect x="3" y="3" width="4" height="4" fill="currentColor" />
                      <rect x="2" y="6" width="2" height="2" fill="currentColor" />
                      <rect x="6" y="6" width="2" height="2" fill="currentColor" />
                      <rect x="1" y="7" width="2" height="2" fill="currentColor" />
                      <rect x="7" y="7" width="2" height="2" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 10 10" shapeRendering="crispEdges" className="w-12 h-12 text-rose-400">
                      <rect x="3" y="1" width="4" height="2" fill="currentColor" />
                      <rect x="3" y="7" width="4" height="2" fill="currentColor" />
                      <rect x="1" y="3" width="2" height="4" fill="currentColor" />
                      <rect x="7" y="3" width="2" height="4" fill="currentColor" />
                    </svg>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
