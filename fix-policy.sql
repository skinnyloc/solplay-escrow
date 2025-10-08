-- Drop the existing policy first
DROP POLICY IF EXISTS "Players can update their games" ON games;

-- Recreate the policy allowing anyone to update for now
CREATE POLICY "Players can update their games"
ON games FOR UPDATE
USING (true);
