-- Users table schema for tracking player stats

CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  total_games_won INTEGER DEFAULT 0,
  total_games_played INTEGER DEFAULT 0,
  total_earnings DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_earnings
ON users(total_earnings DESC);

CREATE INDEX IF NOT EXISTS idx_users_wins
ON users(total_games_won DESC);

-- Create updated_at trigger
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read user stats
CREATE POLICY "User stats are viewable by everyone"
ON users FOR SELECT
USING (true);

-- Policy: Anyone can insert users
CREATE POLICY "Anyone can create user profiles"
ON users FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can update users (for game resolution)
CREATE POLICY "Anyone can update user stats"
ON users FOR UPDATE
USING (true);

COMMENT ON TABLE users IS 'User statistics and leaderboard data';
COMMENT ON COLUMN users.wallet_address IS 'Solana wallet public key';
COMMENT ON COLUMN users.total_games_won IS 'Total number of games won';
COMMENT ON COLUMN users.total_games_played IS 'Total number of games played';
COMMENT ON COLUMN users.total_earnings IS 'Net earnings in SOL (can be negative)';
