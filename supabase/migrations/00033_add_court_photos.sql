-- Migration: 00033_add_court_photos.sql
-- Adds photo_url column to resources for court photos.
--
-- DOWN: ALTER TABLE resources DROP COLUMN IF EXISTS photo_url;

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
