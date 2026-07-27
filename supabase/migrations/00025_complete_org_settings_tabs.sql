-- Migration: 00025_complete_org_settings_tabs.sql
-- Preference buckets for the completed settings tabs.

ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "booking_created": true,
    "booking_cancelled": true,
    "payment_received": true,
    "daily_digest": true,
    "marketing": false,
    "email": true,
    "sms": false,
    "push": true
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS integration_settings JSONB NOT NULL DEFAULT '{
    "google_calendar": false,
    "outlook_calendar": false,
    "stripe": false,
    "gcash": false,
    "webhooks": false,
    "public_api": false
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS security_settings JSONB NOT NULL DEFAULT '{
    "two_factor": false,
    "session_timeout_minutes": 120,
    "staff_can_export": false,
    "require_strong_passwords": true,
    "login_alerts": true
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS role_settings JSONB NOT NULL DEFAULT '{
    "staff_can_manage_bookings": true,
    "staff_can_manage_customers": false,
    "staff_can_view_reports": false,
    "staff_can_manage_payments": false
  }'::jsonb;
