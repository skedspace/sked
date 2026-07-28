-- Migration: 00035_add_board_title_settings.sql
-- Board display settings for the live board view header.

ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS board_title TEXT NOT NULL DEFAULT 'Gameboard',
  ADD COLUMN IF NOT EXISTS board_tagline TEXT NOT NULL DEFAULT 'Live court status & player rotation';
