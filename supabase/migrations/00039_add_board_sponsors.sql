-- Migration: 00037_add_board_sponsors.sql
-- Persist live board sponsors per organization instead of relying on browser-local storage.

ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS board_sponsors JSONB NOT NULL DEFAULT '[]'::jsonb;
