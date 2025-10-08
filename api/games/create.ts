import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    gameId,
    gameType,
    player1Wallet,
    wagerAmount,
    escrowPDA,
    initTxSignature,
  } = req.body;

  if (!gameId || !gameType || !player1Wallet || wagerAmount === undefined || !escrowPDA) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('games')
      .insert({
        id: gameId,
        game_type: gameType,
        player1_wallet: player1Wallet,
        wager_amount: wagerAmount,
        house_fee: wagerAmount * 0.03,
        status: 'waiting',
        escrow_pda: escrowPDA,
        player1_deposited: true, // They just deposited on-chain
        player1_tx_signature: initTxSignature,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json(data);
  } catch (error: any) {
    console.error('Game creation error:', error);
    return res.status(500).json({ error: error.message });
  }
}
