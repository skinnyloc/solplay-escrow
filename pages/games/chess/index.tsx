'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useProgram, getGameEscrowPDA } from '../../../lib/anchorClient';
import { initializeGameEscrow, depositPlayer1, depositPlayer2 } from '../../../lib/gameTransactions';
import { PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ChessPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useProgram();

  const [selectedBet, setSelectedBet] = useState(0.01);
  const [depositStatus, setDepositStatus] = useState<'idle' | 'initializing' | 'depositing' | 'complete'>('idle');
  const [gameId, setGameId] = useState<string | null>(null);

  const handleFindMatch = async () => {
    if (!publicKey || !program) {
      alert('Connect wallet first');
      return;
    }

    setDepositStatus('initializing');

    try {
      // Check for existing match
      const response = await fetch('/api/matchmaking/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          gameType: 'chess',
          wagerAmount: selectedBet,
        }),
      });

      const data = await response.json();

      if (data.matched) {
        // Found a match! You're player 2
        setGameId(data.gameId);

        // Check if bet was adjusted
        if (data.wagerAmount < selectedBet) {
          alert(`Bet adjusted to ${data.wagerAmount} SOL to match opponent`);
        }

        // Deposit as player 2
        setDepositStatus('depositing');
        const tx = await depositPlayer2(program, data.gameId, publicKey);

        alert('Deposited! Game starting...');
        setDepositStatus('complete');

        // Navigate to game
        window.location.href = `/games/chess/play/${data.gameId}`;

      } else {
        // No match - create new game
        const newGameId = `game_${Date.now()}`;
        setGameId(newGameId);

        // Initialize escrow on-chain
        const { signature, escrowPDA } = await initializeGameEscrow(
          program,
          newGameId,
          selectedBet,
          publicKey
        );

        // Create game in database
        await fetch('/api/games/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: newGameId,
            gameType: 'chess',
            player1Wallet: publicKey.toString(),
            wagerAmount: selectedBet,
            escrowPDA,
            initTxSignature: signature,
          }),
        });

        // Deposit as player 1
        setDepositStatus('depositing');
        const depositTx = await depositPlayer1(program, newGameId, publicKey);

        alert('Waiting for opponent...');
        setDepositStatus('complete');

        // Poll for opponent
        pollForOpponent(newGameId);
      }
    } catch (error: any) {
      console.error('Deposit error:', error);
      alert(error.message || 'Transaction failed');
      setDepositStatus('idle');
    }
  };

  const pollForOpponent = (gameId: string) => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (data?.status === 'matched') {
        clearInterval(interval);
        window.location.href = `/games/chess/play/${gameId}`;
      }
    }, 2000);

    // Timeout after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Devnet Indicator */}
      <div className="bg-purple-900/20 border border-purple-500 rounded p-4 mb-6">
        <p className="text-purple-400 text-sm">
          🔧 DEVNET MODE - Using test SOL (get free SOL at https://faucet.solana.com)
        </p>
      </div>

      <h1 className="text-4xl font-bold mb-8">Chess ♟️</h1>

      <div className="card bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Select Wager</h3>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[0.001, 0.01, 0.05, 0.1, 0.5, 1].map(amount => (
            <button
              key={amount}
              onClick={() => setSelectedBet(amount)}
              className={`px-4 py-3 rounded ${
                selectedBet === amount
                  ? 'bg-teal-600 ring-2 ring-teal-400'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {amount} SOL
            </button>
          ))}
        </div>

        <div className="mb-4 p-4 bg-gray-900 rounded">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Your bet:</span>
            <span className="font-bold">{selectedBet} SOL</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">House fee (3%):</span>
            <span className="font-bold">{(selectedBet * 2 * 0.03).toFixed(4)} SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Potential win:</span>
            <span className="font-bold text-green-400">
              {(selectedBet * 2 * 0.97).toFixed(4)} SOL
            </span>
          </div>
        </div>

        <button
          onClick={handleFindMatch}
          disabled={!publicKey || depositStatus !== 'idle'}
          className={`w-full py-3 rounded font-bold ${
            !publicKey || depositStatus !== 'idle'
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {depositStatus === 'idle' && 'Find Match & Deposit'}
          {depositStatus === 'initializing' && 'Initializing...'}
          {depositStatus === 'depositing' && 'Please approve transaction in wallet...'}
          {depositStatus === 'complete' && 'Complete!'}
        </button>
      </div>
    </div>
  );
}
