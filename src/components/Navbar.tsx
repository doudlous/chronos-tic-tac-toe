import React from 'react';
import { User } from 'firebase/auth';
import { Volume2, VolumeX, LogIn, LogOut, Swords, Sparkles, Layers, Loader2 } from 'lucide-react';
import { loginWithGoogle, logoutUser } from '../firebase/config';

interface NavbarProps {
  currentUser: User | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onNewGame: () => void;
  onOpenEventLog?: () => void;
  hasActiveGame: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isMuted,
  onToggleMute,
  onNewGame,
  onOpenEventLog,
  hasActiveGame,
}) => {
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.warn('Sign in dismissed or failed:', err);
    } finally {
      setIsSigningIn(false);
    }
  };
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={onNewGame}
          className="flex items-center gap-3 cursor-pointer group"
          title="Return to Arena Lobby"
        >
          <div className="w-9 h-9 bg-slate-900 border-2 border-cyan-400 pixel-box flex items-center justify-center font-pixel-title text-cyan-400 text-xs group-hover:scale-105 transition-transform">
            XO
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-pixel-title text-xs sm:text-sm text-slate-100 tracking-wider group-hover:text-cyan-400 transition-colors">
                RETRO TIC-TAC-TOE
              </h1>
            </div>
            <p className="font-pixel-mono text-xs text-slate-400 hidden sm:block">
              REPLAY & EVENT SOURCING ARENA
            </p>
          </div>
        </div>

        {/* Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {hasActiveGame && (
            <button
              onClick={onNewGame}
              className="px-3 py-1.5 font-pixel-title text-[9px] text-slate-200 bg-slate-900 border border-slate-700 pixel-btn flex items-center gap-1.5"
            >
              <Swords className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">LOBBY</span>
            </button>
          )}

          {hasActiveGame && onOpenEventLog && (
            <button
              onClick={onOpenEventLog}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5"
              title="Inspect Event Stream"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Event Log</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Auth Bar */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Player'}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-900 border border-cyan-700 flex items-center justify-center text-xs font-bold text-cyan-200">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'P'}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <div className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                  {currentUser.displayName || 'Player'}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {currentUser.email}
                </div>
              </div>
              <button
                onClick={logoutUser}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="px-3 py-1.5 font-pixel-title text-[9px] text-slate-950 bg-cyan-400 hover:bg-cyan-300 pixel-btn transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-slate-950" />
                  <span>CONNECTING...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3 h-3" />
                  <span>SIGN IN</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
