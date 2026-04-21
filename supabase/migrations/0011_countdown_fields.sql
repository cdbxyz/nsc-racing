ALTER TABLE races
  ADD COLUMN IF NOT EXISTS countdown_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS countdown_abandoned_at timestamptz;
