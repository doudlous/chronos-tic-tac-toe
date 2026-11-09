import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  testConnection,
  handleFirestoreError,
  OperationType,
} from './firebase/config';
import { AiDifficulty, GameDoc, PlayerSymbol } from './types/game';
import { sound } from './utils/audio';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { GameView } from './components/GameView';

function generateShortGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prefillCode, setPrefillCode] = useState<string>('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // 1. Mandatory Firestore Connection validation test on boot
  useEffect(() => {
    testConnection().catch((err) => {
      console.warn('Initial connection probe warning:', err);
    });
  }, []);

  // 2. Auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // 3. Inspect URL search query for ?code=... or ?game=...
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    const gameParam = params.get('game');

    if (codeParam) {
      setPrefillCode(codeParam.trim().toUpperCase());
    } else if (gameParam) {
      setActiveGameId(gameParam.trim());
    }
  }, []);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Create match against Minimax AI
  const handleCreateAiGame = async (
    difficulty: AiDifficulty,
    mySymbol: PlayerSymbol
  ) => {
    if (!currentUser) return;
    setIsCreatingGame(true);
    setGlobalError(null);

    const gameId = `g_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const gameCode = generateShortGameCode();
    const playerName = (currentUser.displayName || 'Player').slice(0, 50);

    const isPlayingAsX = mySymbol === 'X';

    const gamePayload = {
      id: gameId,
      gameCode,
      mode: 'ai',
      status: 'in_progress',
      createdBy: currentUser.uid,
      playerXUid: isPlayingAsX ? currentUser.uid : 'ai',
      playerXName: isPlayingAsX ? playerName : 'Minimax AI',
      playerOUid: isPlayingAsX ? 'ai' : currentUser.uid,
      playerOName: isPlayingAsX ? 'Minimax AI' : playerName,
      currentTurn: 'X',
      winner: 'none',
      eventCount: 0,
      aiDifficulty: difficulty,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'games', gameId), gamePayload);
      setActiveGameId(gameId);
      window.history.pushState({}, '', `?game=${gameId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `games/${gameId}`);
    } finally {
      setIsCreatingGame(false);
    }
  };

  // Create match for multiplayer PVP
  const handleCreatePvpGame = async () => {
    if (!currentUser) return;
    setIsCreatingGame(true);
    setGlobalError(null);

    const gameId = `g_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const gameCode = generateShortGameCode();
    const playerName = (currentUser.displayName || 'Player').slice(0, 50);

    const gamePayload = {
      id: gameId,
      gameCode,
      mode: 'pvp',
      status: 'waiting',
      createdBy: currentUser.uid,
      playerXUid: currentUser.uid,
      playerXName: playerName,
      playerOUid: '',
      playerOName: '',
      currentTurn: 'X',
      winner: 'none',
      eventCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'games', gameId), gamePayload);
      setActiveGameId(gameId);
      window.history.pushState({}, '', `?code=${gameCode}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `games/${gameId}`);
    } finally {
      setIsCreatingGame(false);
    }
  };

  // Join match by short code
  const handleJoinGameByCode = async (code: string) => {
    if (!currentUser) return;
    setGlobalError(null);

    const sanitizedCode = code.trim().toUpperCase();
    const gamesRef = collection(db, 'games');
    const q = query(gamesRef, where('gameCode', '==', sanitizedCode), limit(1));

    try {
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error(`No match found with code "${sanitizedCode}". Please double check.`);
      }

      const matchDoc = snap.docs[0];
      const matchData = matchDoc.data() as GameDoc;

      // If already a player in this match, resume
      if (
        matchData.playerXUid === currentUser.uid ||
        matchData.playerOUid === currentUser.uid
      ) {
        setActiveGameId(matchDoc.id);
        window.history.pushState({}, '', `?game=${matchDoc.id}`);
        return;
      }

      // If waiting for player O, join as player O!
      if (matchData.status === 'waiting' && matchData.playerOUid === '') {
        const playerName = (currentUser.displayName || 'Player O').slice(0, 50);
        await updateDoc(doc(db, 'games', matchDoc.id), {
          playerOUid: currentUser.uid,
          playerOName: playerName,
          status: 'in_progress',
          updatedAt: serverTimestamp(),
        });
        setActiveGameId(matchDoc.id);
        window.history.pushState({}, '', `?game=${matchDoc.id}`);
        return;
      }

      // If already full
      throw new Error('This match already has two players.');
    } catch (err: any) {
      if (err.message && err.message.includes('No match found')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.GET, 'games');
    }
  };

  const handleResumeGame = (gameId: string) => {
    setActiveGameId(gameId);
    window.history.pushState({}, '', `?game=${gameId}`);
  };

  const handleBackToLobby = () => {
    setActiveGameId(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onNewGame={handleBackToLobby}
        hasActiveGame={Boolean(activeGameId)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {globalError && (
          <div className="max-w-xl mx-auto mt-4 px-4 py-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {globalError}
          </div>
        )}

        {activeGameId ? (
          <GameView
            gameId={activeGameId}
            currentUser={currentUser}
            onBackToLobby={handleBackToLobby}
          />
        ) : (
          <Lobby
            currentUser={currentUser}
            onCreateAiGame={handleCreateAiGame}
            onCreatePvpGame={handleCreatePvpGame}
            onJoinGameByCode={handleJoinGameByCode}
            onResumeGame={handleResumeGame}
            isCreating={isCreatingGame}
            prefillCode={prefillCode}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>
          Event Sourcing Tic-Tac-Toe Arena • Built with Firebase Firestore & Authentication • Zero LLM Minimax AI
        </p>
      </footer>
    </div>
  );
}
