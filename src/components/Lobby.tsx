import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from 'firebase/firestore';
import {
  Bot,
  Users,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Play,
  RotateCcw,
  Zap,
  LogIn,
  Loader2,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, loginWithGoogle } from '../firebase/config';
import { AiDifficulty, GameDoc, PlayerSymbol } from '../types/game';

interface LobbyProps {
  currentUser: User | null;
  onCreateAiGame: (difficulty: AiDifficulty, mySymbol: PlayerSymbol) => Promise<void>;
  onCreatePvpGame: () => Promise<void>;
  onJoinGameByCode: (code: string) => Promise<void>;
  onResumeGame: (gameId: string) => void;
  isCreating: boolean;
  prefillCode?: string;
}

export const Lobby: React.FC<LobbyProps> = ({
  currentUser,
  onCreateAiGame,
  onCreatePvpGame,
  onJoinGameByCode,
  onResumeGame,
  isCreating,
  prefillCode = '',
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<AiDifficulty>('unbeatable');
  const [selectedSymbol, setSelectedSymbol] = useState<PlayerSymbol>('X');
  const [joinCodeInput, setJoinCodeInput] = useState<string>(prefillCode);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      return await loginWithGoogle();
    } catch (err) {
      console.warn('Sign in cancelled or failed:', err);
      return null;
    } finally {
      setIsSigningIn(false);
    }
  };

  // Recent games
  const [recentGames, setRecentGames] = useState<GameDoc[]>([]);
  const [loadingRecent, setLoadingRecent] = useState<boolean>(false);

  useEffect(() => {
    if (prefillCode) {
      setJoinCodeInput(prefillCode.toUpperCase());
    }
  }, [prefillCode]);

  useEffect(() => {
    if (!currentUser) {
      setRecentGames([]);
      return;
    }

    const fetchRecent = async () => {
      setLoadingRecent(true);
      try {
        const qX = query(
          collection(db, 'games'),
          where('playerXUid', '==', currentUser.uid),
          limit(6)
        );
        const snap = await getDocs(qX);
        const games: GameDoc[] = [];
        snap.forEach((doc) => {
          games.push(doc.data() as GameDoc);
        });

        // Also games as player O
        const qO = query(
          collection(db, 'games'),
          where('playerOUid', '==', currentUser.uid),
          limit(6)
        );
        const snapO = await getDocs(qO);
        snapO.forEach((doc) => {
          if (!games.some((g) => g.id === doc.id)) {
            games.push(doc.data() as GameDoc);
          }
        });

        // Sort descending by updatedAt
        games.sort((a, b) => {
          const tA = (a.updatedAt as any)?.seconds ?? 0;
          const tB = (b.updatedAt as any)?.seconds ?? 0;
          return tB - tA;
        });

        setRecentGames(games.slice(0, 5));
      } catch (err) {
        // Silent catch for recent games list
        console.warn('Could not load recent games:', err);
      } finally {
        setLoadingRecent(false);
      }
    };

    fetchRecent();
  }, [currentUser]);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    if (!currentUser) {
      const user = await handleGoogleSignIn();
      if (!user) return;
    }

    setIsJoining(true);
    setJoinError(null);
    try {
      await onJoinGameByCode(joinCodeInput.trim().toUpperCase());
    } catch (err: any) {
      setJoinError(err.message || 'Game code not found or unable to join.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border-2 border-cyan-500 pixel-box text-cyan-300 font-pixel-mono text-xs">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>8-BIT EVENT SOURCING ARENA</span>
        </div>
        <h2 className="font-pixel-title text-xl sm:text-2xl text-slate-100 tracking-wider">
          RETRO TIC-TAC-TOE
        </h2>
        <p className="font-pixel-body text-xs text-slate-400">
          Battle pure algorithmic Minimax AI or challenge rivals in real-time.
          Replay turn snapshots and restore previous game states.
        </p>
      </div>

      {/* Auth Banner if not signed in */}
      {!currentUser && (
        <div className="bg-slate-950 border-4 border-cyan-500/80 p-5 pixel-box flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-pixel-title text-xs text-slate-100 flex items-center gap-2 justify-center sm:justify-start">
              <Shield className="w-4 h-4 text-cyan-400" />
              INSERT COIN / GOOGLE SIGN-IN
            </h3>
            <p className="font-pixel-body text-xs text-slate-300 max-w-lg">
              Sign in to record moves, create multiplayer room codes, and restore past turns.
            </p>
          </div>
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="shrink-0 px-4 py-2.5 font-pixel-title text-[9px] bg-cyan-400 hover:bg-cyan-300 text-slate-950 pixel-btn flex items-center gap-2 disabled:opacity-50"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>CONNECTING...</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>SIGN IN (GOOGLE)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Game Mode Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Single Player vs AI */}
        <div className="bg-slate-950 border-2 border-slate-800 p-6 pixel-box flex flex-col justify-between transition-all">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/60 pixel-box flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-pixel-title text-xs text-slate-100">VS MINIMAX AI</h3>
                <p className="font-pixel-mono text-xs text-slate-400">
                  Algorithmic CPU opponent (zero LLM calls)
                </p>
              </div>
            </div>

            {/* AI Difficulty Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Minimax AI Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'unbeatable'] as AiDifficulty[]).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold capitalize transition ${
                      selectedDifficulty === diff
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-bold'
                        : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {diff === 'unbeatable' ? '★ Unbeatable' : diff}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                {selectedDifficulty === 'unbeatable'
                  ? 'Mathematically optimal Minimax search. Cannot be defeated.'
                  : selectedDifficulty === 'medium'
                  ? 'Strategic play with occasional human-like slips.'
                  : 'Casual play with randomized moves.'}
              </p>
            </div>

            {/* Symbol Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Choose Your Piece
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSymbol('X')}
                  className={`py-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                    selectedSymbol === 'X'
                      ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base text-cyan-400">✕</span>
                  <span>Play as X (First)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSymbol('O')}
                  className={`py-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                    selectedSymbol === 'O'
                      ? 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base text-rose-400">◯</span>
                  <span>Play as O (Second)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={async () => {
                if (!currentUser) {
                  const user = await handleGoogleSignIn();
                  if (!user) return;
                }
                onCreateAiGame(selectedDifficulty, selectedSymbol);
              }}
              disabled={isCreating || isSigningIn}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Connecting Google Account...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isCreating ? 'Setting Up Match...' : 'Start AI Match'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Multiplayer PVP */}
        <div className="bg-slate-950 border-2 border-slate-800 p-6 pixel-box flex flex-col justify-between transition-all">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 border-2 border-amber-500/60 pixel-box flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-pixel-title text-xs text-slate-100">MULTIPLAYER ARENA</h3>
                <p className="font-pixel-mono text-xs text-slate-400">
                  Real-time sync via Firestore with room codes
                </p>
              </div>
            </div>

            {/* Option A: Create Match */}
            <div className="bg-slate-900 border-2 border-slate-800 p-4 pixel-box space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-pixel-title text-[10px] text-slate-200">HOST A MATCH</div>
                  <div className="font-pixel-mono text-xs text-slate-400">Generates share link & 6-digit code</div>
                </div>
                <button
                  onClick={async () => {
                    if (!currentUser) {
                      const user = await handleGoogleSignIn();
                      if (!user) return;
                    }
                    onCreatePvpGame();
                  }}
                  disabled={isCreating || isSigningIn}
                  className="px-3 py-2 font-pixel-title text-[9px] bg-amber-500 hover:bg-amber-400 text-slate-950 pixel-btn flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Users className="w-3 h-3" />
                  )}
                  <span>CREATE ROOM</span>
                </button>
              </div>
            </div>

            {/* Option B: Join by Code */}
            <form onSubmit={handleJoinSubmit} className="bg-slate-900 border-2 border-slate-800 p-4 pixel-box space-y-3">
              <div>
                <div className="font-pixel-title text-[10px] text-slate-200 mb-0.5">JOIN MATCH</div>
                <div className="font-pixel-mono text-xs text-slate-400">Enter friend's 6-character room code</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. TK8429"
                  maxLength={10}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-950 border-2 border-slate-700 px-3 py-2 font-pixel-mono text-sm font-bold uppercase tracking-wider text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={isJoining || !joinCodeInput.trim()}
                  className="px-4 py-2 font-pixel-title text-[9px] bg-slate-800 hover:bg-slate-700 text-cyan-300 pixel-btn flex items-center gap-1.5 disabled:opacity-40"
                >
                  <span>{isJoining ? '...' : 'JOIN'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {joinError && (
                <p className="font-pixel-mono text-xs text-rose-400">{joinError}</p>
              )}
            </form>
          </div>

          <div className="pt-4 font-pixel-mono text-xs text-slate-500 text-center">
            Both players can view turn history and roll back moves together in real time.
          </div>
        </div>
      </div>

      {/* Recent Games List */}
      {currentUser && recentGames.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Your Recent Matches
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {recentGames.length} matches
            </span>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recentGames.map((game) => {
              const isX = game.playerXUid === currentUser.uid;
              const myRole = isX ? 'Player X' : 'Player O';
              const opponent = isX
                ? game.playerOName || (game.mode === 'ai' ? 'Minimax AI' : 'Waiting for opponent...')
                : game.playerXName;

              return (
                <div
                  key={game.id}
                  onClick={() => onResumeGame(game.id)}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-mono text-[11px] font-bold text-cyan-400">
                        {game.gameCode}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          game.status === 'in_progress'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : game.status === 'waiting'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {game.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-200 truncate">
                      vs {opponent}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      You: {myRole} ({game.mode === 'ai' ? 'AI Match' : 'PVP'})
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-cyan-400 transition-colors">
                    <span>{game.eventCount || 0} events</span>
                    <span className="font-semibold flex items-center gap-1">
                      Resume <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
