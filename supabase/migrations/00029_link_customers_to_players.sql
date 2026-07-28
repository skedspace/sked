-- Migration: 00029_link_customers_to_players.sql
-- Links the players table to customers so booking auto-creates a player record.
-- Adds foreign key, changes default skill_level to 2.0 (beginner), and adds index.
--
-- DOWN:
--   DROP INDEX IF EXISTS idx_players_customer;
--   ALTER TABLE players DROP COLUMN IF EXISTS customer_id;
--   ALTER TABLE players ALTER COLUMN skill_level SET DEFAULT 3.0;

-- 1. Add customer_id FK column (nullable — a player can be created onsite without a customer link)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 2. Change default skill_level from 3.0 to 2.0 (beginner)
ALTER TABLE players
  ALTER COLUMN skill_level SET DEFAULT 2.0;

-- 3. Index for quick lookups by customer
CREATE INDEX IF NOT EXISTS idx_players_customer ON players(customer_id);
