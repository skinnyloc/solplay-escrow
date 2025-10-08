import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { getGameEscrowPDA } from '../../lib/anchorClient';
import idl from '../../lib/solplay_escrow.json';
import { createClient } from '@supabase/supabase-js';
import bs58 from 'bs58';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const PROGRAM_ID = new PublicKey('32zTMac534KhSsMHnyNYrgaZDdv6vjp6EVZZPjMno3Nq');

// Server keypair for signing
// IMPORTANT: In production, store private key in environment variable!
// For now using a generated keypair - replace with: Keypair.fromSecretKey(bs58.decode(process.env.SERVER_PRIVATE_KEY!))
const SERVER_KEYPAIR = process.env.SERVER_PRIVATE_KEY
  ? Keypair.fromSecretKey(bs58.decode(process.env.SERVER_PRIVATE_KEY))
  : Keypair.generate();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameId, winnerWallet } = req.body;

  if (!gameId || !winnerWallet) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get game details
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status !== 'active' && game.status !== 'matched') {
      return res.status(400).json({ error: 'Game not eligible for payout' });
    }

    // Setup Anchor client (server-side)
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const wallet = new Wallet(SERVER_KEYPAIR);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = new Program(idl as any, provider);

    const player1 = new PublicKey(game.player1_wallet);
    const player2 = new PublicKey(game.player2_wallet);
    const winner = new PublicKey(winnerWallet);
    const houseWallet = new PublicKey('GQ95MH74f2kF6Aqv5dy6PSKq3S1xfwQowwYYqVQPNTMe');

    const [gameEscrowPDA] = getGameEscrowPDA(gameId);

    // Call smart contract to resolve and payout
    const tx = await program.methods
      .resolveGame(winner)
      .accounts({
        gameEscrow: gameEscrowPDA,
        player1: player1,
        player2: player2,
        houseWallet: houseWallet,
      })
      .rpc();

    console.log('Payout transaction:', tx);

    // Calculate amounts
    const winnerAmount = game.wager_amount * 2 * 0.97;
    const loserWallet = game.player1_wallet === winnerWallet ? game.player2_wallet : game.player1_wallet;

    // Update game in database
    await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_wallet: winnerWallet,
        resolve_tx_signature: tx,
        completed_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    // Update winner stats
    const { data: winnerUser } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', winnerWallet)
      .single();

    if (winnerUser) {
      await supabase
        .from('users')
        .update({
          total_games_won: (winnerUser.total_games_won || 0) + 1,
          total_earnings: (winnerUser.total_earnings || 0) + winnerAmount,
        })
        .eq('wallet_address', winnerWallet);
    } else {
      // Create user if doesn't exist
      await supabase
        .from('users')
        .insert({
          wallet_address: winnerWallet,
          total_games_won: 1,
          total_earnings: winnerAmount,
        });
    }

    // Update loser stats
    const { data: loserUser } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', loserWallet)
      .single();

    if (loserUser) {
      await supabase
        .from('users')
        .update({
          total_earnings: (loserUser.total_earnings || 0) - game.wager_amount,
        })
        .eq('wallet_address', loserWallet);
    } else {
      // Create user if doesn't exist
      await supabase
        .from('users')
        .insert({
          wallet_address: loserWallet,
          total_games_won: 0,
          total_earnings: -game.wager_amount,
        });
    }

    return res.json({
      success: true,
      signature: tx,
      winnerAmount,
    });

  } catch (error: any) {
    console.error('Payout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
