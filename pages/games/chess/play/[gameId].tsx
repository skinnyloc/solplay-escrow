'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { createClient } from '@supabase/supabase-js';
import { GameResultModal } from '../../../../components/GameResultModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ChessGamePage() {
  const router = useRouter();
  const { gameId } = router.query;
  const { publicKey } = useWallet();

  const [game, setGame] = useState<any>(null);
  const [gameResult, setGameResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    loadGame();

    // Subscribe to game updates
    const subscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      }, (payload) => {
        setGame(payload.new);

        // Check if game completed
        if (payload.new.status === 'completed') {
          handleGameCompleted(payload.new);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [gameId]);

  const loadGame = async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error) {
      console.error('Error loading game:', error);
      return;
    }

    setGame(data);
    setLoading(false);

    // Check if already completed
    if (data.status === 'completed') {
      handleGameCompleted(data);
    }
  };

  const handleGameCompleted = (gameData: any) => {
    if (!publicKey) return;

    const isWinner = gameData.winner_wallet === publicKey.toString();
    const amount = gameData.wager_amount * (isWinner ? 2 * 0.97 : 1);

    setGameResult({
      isWinner,
      amount,
      signature: gameData.resolve_tx_signature,
    });
  };

  const handleGameComplete = async (winnerWallet: string) => {
    try {
      // Mark game as active first (to prevent duplicate calls)
      await supabase
        .from('games')
        .update({
          status: 'active',
        })
        .eq('id', gameId);

      // Trigger server-side payout
      const response = await fetch('/api/games/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          winnerWallet,
        }),
      });

      if (!response.ok) {
        throw new Error('Payout failed');
      }

      const data = await response.json();

      // Show result modal
      const isWinner = winnerWallet === publicKey?.toString();
      setGameResult({
        isWinner,
        amount: data.winnerAmount,
        signature: data.signature,
      });

      alert('Game complete! Payouts sent!');

    } catch (error: any) {
      console.error('Error completing game:', error);
      alert('Payout failed: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Game not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-purple-900/20 border border-purple-500 rounded p-4 mb-6">
        <p className="text-purple-400 text-sm">
          🔧 DEVNET MODE - Real SOL transactions on devnet
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Game {gameId}</h2>
              <p className="text-sm text-gray-400">Status: {game.status}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Pot</p>
              <p className="text-2xl font-bold text-teal-400">
                {(game.wager_amount * 2).toFixed(4)} SOL
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 p-4 rounded">
              <p className="text-sm text-gray-400 mb-1">Player 1</p>
              <p className="text-xs font-mono truncate">{game.player1_wallet}</p>
            </div>
            <div className="bg-gray-900 p-4 rounded">
              <p className="text-sm text-gray-400 mb-1">Player 2</p>
              <p className="text-xs font-mono truncate">
                {game.player2_wallet || 'Waiting...'}
              </p>
            </div>
          </div>
        </div>

        {/* Chess board placeholder - integrate your chess library here */}
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="aspect-square bg-gray-700 rounded flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl mb-4">♟️ Chess Board</p>
              <p className="text-sm text-gray-400 mb-6">
                Integrate chess.js and react-chessboard here
              </p>

              {/* Test button to simulate game completion */}
              {publicKey && (
                <button
                  onClick={() => handleGameComplete(publicKey.toString())}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 rounded font-bold"
                >
                  [TEST] End Game - I Win
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Result Modal */}
      {gameResult && (
        <GameResultModal
          isWinner={gameResult.isWinner}
          amount={gameResult.amount}
          signature={gameResult.signature}
          onClose={() => setGameResult(null)}
        />
      )}
    </div>
  );
}
