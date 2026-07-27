-- Migration: 00024_create_org_settings.sql
-- Organization-level preferences used by the redesigned settings dashboard.

CREATE TABLE IF NOT EXISTS org_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    business_type TEXT NOT NULL DEFAULT 'Pickleball Club',
    website TEXT,
    address TEXT,
    primary_color TEXT NOT NULL DEFAULT '#22C55E',
    accent_color TEXT NOT NULL DEFAULT '#0F172A',
    booking_window_days INTEGER NOT NULL DEFAULT 7 CHECK (booking_window_days > 0),
    minimum_notice_minutes INTEGER NOT NULL DEFAULT 60 CHECK (minimum_notice_minutes >= 0),
    cancellation_notice_hours INTEGER NOT NULL DEFAULT 24 CHECK (cancellation_notice_hours >= 0),
    booking_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (booking_interval_minutes > 0),
    overlapping_bookings BOOLEAN NOT NULL DEFAULT false,
    auto_confirmation BOOLEAN NOT NULL DEFAULT true,
    language TEXT NOT NULL DEFAULT 'English',
    date_format TEXT NOT NULL DEFAULT 'MMM d, yyyy',
    time_format TEXT NOT NULL DEFAULT '12-hour (AM/PM)',
    currency TEXT NOT NULL DEFAULT 'PHP (₱)',
    number_format TEXT NOT NULL DEFAULT '1,234.56',
    timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
    default_homepage TEXT NOT NULL DEFAULT 'Dashboard',
    default_tab TEXT NOT NULL DEFAULT 'Calendar',
    items_per_page INTEGER NOT NULL DEFAULT 20 CHECK (items_per_page > 0),
    dark_mode BOOLEAN NOT NULL DEFAULT false,
    compact_view BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_members_can_view_org_settings ON org_settings
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY owners_can_manage_org_settings ON org_settings
    FOR ALL
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    ))
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    ));

CREATE TRIGGER update_org_settings_updated_at
    BEFORE UPDATE ON org_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
