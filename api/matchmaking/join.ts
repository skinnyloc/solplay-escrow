import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress, gameType, wagerAmount } = req.body;

  if (!walletAddress || !gameType || wagerAmount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check for waiting game
    const { data: waitingGame, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', gameType)
      .lte('wager_amount', wagerAmount) // Match or lower bet
      .eq('status', 'waiting')
      .is('player2_wallet', null)
      .order('wager_amount', { ascending: false }) // Get highest matching bet
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "no rows found" which is fine
      throw fetchError;
    }

    if (waitingGame) {
      // Match found! Use the waiting game's wager amount
      const matchedWager = waitingGame.wager_amount;

      const { error: updateError } = await supabase
        .from('games')
        .update({
          player2_wallet: walletAddress,
          status: 'matched',
          wager_amount: matchedWager, // Both players use this amount
        })
        .eq('id', waitingGame.id);

      if (updateError) throw updateError;

      return res.json({
        matched: true,
        gameId: waitingGame.id,
        wagerAmount: matchedWager, // Tell frontend the matched amount
        escrowPDA: waitingGame.escrow_pda,
      });
    } else {
      // No match found - frontend will create new game
      return res.json({ matched: false });
    }
  } catch (error: any) {
    console.error('Matchmaking error:', error);
    return res.status(500).json({ error: error.message });
  }
}
