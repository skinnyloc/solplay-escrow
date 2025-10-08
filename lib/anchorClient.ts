import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import idl from './solplay_escrow.json';

// Program ID from deployed contract
const PROGRAM_ID = new PublicKey('32zTMac534KhSsMHnyNYrgaZDdv6vjp6EVZZPjMno3Nq');

// DEVNET connection
const DEVNET_RPC = 'https://api.devnet.solana.com';

export function useProgram() {
  const wallet = useAnchorWallet();

  if (!wallet) return null;

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  const program = new Program(idl as any, provider);

  return program;
}

// Helper: Get game escrow PDA address
export function getGameEscrowPDA(gameId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('game_escrow'), Buffer.from(gameId)],
    PROGRAM_ID
  );
}

// Helper: Convert SOL to lamports
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

// Helper: Convert lamports to SOL
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}
