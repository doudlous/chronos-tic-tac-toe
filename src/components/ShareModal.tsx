import React, { useState } from 'react';
import { X, Copy, Check, Share2, Users, Loader2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameCode: string;
  isWaitingForOpponent: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  gameCode,
  isWaitingForOpponent,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/?code=${encodeURIComponent(gameCode)}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Invite a Friend</h3>
              <p className="text-xs text-slate-400">Share match code or direct join link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Game Code Box */}
        <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-5 text-center mb-5 relative overflow-hidden">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-cyan-400 mb-1">
            Short Game Code
          </div>
          <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-slate-100 mb-3 select-all">
            {gameCode}
          </div>
          <button
            onClick={handleCopyCode}
            className="w-full py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition"
          >
            {copiedCode ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Code Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-cyan-400" />
                <span>Copy Short Code</span>
              </>
            )}
          </button>
        </div>

        {/* Share Link Box */}
        <div className="mb-5 space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Direct Share Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 select-all focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition flex items-center gap-1.5 shrink-0 shadow-md shadow-cyan-500/20"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Waiting status pill */}
        {isWaitingForOpponent && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-300">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <span>Waiting for your friend to enter code and join...</span>
          </div>
        )}
      </div>
    </div>
  );
};
