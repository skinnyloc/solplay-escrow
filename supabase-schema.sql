-- Supabase SQL Schema for SolPlay Escrow
-- Copy and paste this into Supabase SQL Editor

-- Step 1: Add 'matched' to the existing game_status enum if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'matched'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'game_status')
  ) THEN
    ALTER TYPE game_status ADD VALUE 'matched';
  END IF;
END $$;

-- Step 2: Alter the status column to use the enum type if it's TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games'
    AND column_name = 'status'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE games ALTER COLUMN status TYPE game_status USING status::game_status;
  END IF;
END $$;

-- Step 3: Add any missing columns
ALTER TABLE games ADD COLUMN IF NOT EXISTS player1_deposited BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player2_deposited BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player1_tx_signature TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player2_tx_signature TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_wallet TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS resolve_tx_signature TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS escrow_pda TEXT;

-- Create index for faster matchmaking queries
CREATE INDEX IF NOT EXISTS idx_games_matchmaking
ON games(game_type, status, wager_amount)
WHERE status = 'waiting' AND player2_wallet IS NULL;

-- Create index for game lookups
CREATE INDEX IF NOT EXISTS idx_games_status
ON games(status);

-- Create index for player lookups
CREATE INDEX IF NOT EXISTS idx_games_player1
ON games(player1_wallet);

CREATE INDEX IF NOT EXISTS idx_games_player2
ON games(player2_wallet);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read games
CREATE POLICY "Games are viewable by everyone"
ON games FOR SELECT
USING (true);

-- Policy: Anyone can insert games (for creating new games)
CREATE POLICY "Anyone can create games"
ON games FOR INSERT
WITH CHECK (true);

-- Policy: Players can update their own games
CREATE POLICY "Players can update their games"
ON games FOR UPDATE
USING (
  auth.uid()::text = player1_wallet
  OR auth.uid()::text = player2_wallet
  OR true  -- Allow updates for now (remove 'OR true' for production)
);

-- Optional: Create a view for active games
CREATE OR REPLACE VIEW active_games AS
SELECT
  id,
  game_type,
  player1_wallet,
  player2_wallet,
  wager_amount,
  status,
  created_at
FROM games
WHERE status IN ('waiting', 'matched', 'active')
ORDER BY created_at DESC;

-- Optional: Create a leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  winner_wallet as wallet,
  COUNT(*) as wins,
  SUM(wager_amount * 2 * 0.97) as total_winnings
FROM games
WHERE status = 'completed' AND winner_wallet IS NOT NULL
GROUP BY winner_wallet
ORDER BY wins DESC, total_winnings DESC;

COMMENT ON TABLE games IS 'Main table for storing game state and escrow information';
COMMENT ON COLUMN games.id IS 'Unique game ID (game_<timestamp>)';
COMMENT ON COLUMN games.game_type IS 'Type of game (chess, poker, etc)';
COMMENT ON COLUMN games.status IS 'Game status: waiting, matched, active, completed, cancelled';
COMMENT ON COLUMN games.escrow_pda IS 'Solana program derived address for escrow account';
COMMENT ON COLUMN games.wager_amount IS 'Wager amount in SOL per player';
COMMENT ON COLUMN games.house_fee IS 'House fee in SOL (3% of total pot)';
