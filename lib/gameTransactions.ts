import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { getGameEscrowPDA, solToLamports } from './anchorClient';

// Initialize game escrow
export async function initializeGameEscrow(
  program: Program,
  gameId: string,
  wagerAmount: number, // in SOL
  player1: PublicKey
) {
  const [gameEscrowPDA] = getGameEscrowPDA(gameId);

  const tx = await program.methods
    .initializeGame(gameId, solToLamports(wagerAmount))
    .accounts({
      gameEscrow: gameEscrowPDA,
      player1: player1,
    })
    .rpc();

  console.log('Game initialized:', tx);
  return { signature: tx, escrowPDA: gameEscrowPDA.toString() };
}

// Player 1 deposits
export async function depositPlayer1(
  program: Program,
  gameId: string,
  player1: PublicKey
) {
  const [gameEscrowPDA] = getGameEscrowPDA(gameId);

  const tx = await program.methods
    .depositPlayer1()
    .accounts({
      gameEscrow: gameEscrowPDA,
      player1: player1,
    })
    .rpc();

  console.log('Player 1 deposited:', tx);
  return tx;
}

// Player 2 deposits
export async function depositPlayer2(
  program: Program,
  gameId: string,
  player2: PublicKey
) {
  const [gameEscrowPDA] = getGameEscrowPDA(gameId);

  const tx = await program.methods
    .depositPlayer2()
    .accounts({
      gameEscrow: gameEscrowPDA,
      player2: player2,
    })
    .rpc();

  console.log('Player 2 deposited:', tx);
  return tx;
}

// Resolve game
export async function resolveGame(
  program: Program,
  gameId: string,
  winner: PublicKey,
  player1: PublicKey,
  player2: PublicKey,
  houseWallet: PublicKey
) {
  const [gameEscrowPDA] = getGameEscrowPDA(gameId);

  const tx = await program.methods
    .resolveGame(winner)
    .accounts({
      gameEscrow: gameEscrowPDA,
      player1: player1,
      player2: player2,
      houseWallet: houseWallet,
    })
    .rpc();

  console.log('Game resolved:', tx);
  return tx;
}

// Cancel game
export async function cancelGame(
  program: Program,
  gameId: string,
  player1: PublicKey
) {
  const [gameEscrowPDA] = getGameEscrowPDA(gameId);

  const tx = await program.methods
    .cancelGame()
    .accounts({
      gameEscrow: gameEscrowPDA,
      player1: player1,
    })
    .rpc();

  console.log('Game cancelled:', tx);
  return tx;
}
