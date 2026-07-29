-- Migration: 00017_create_google_calendar_sync.sql
-- Two-way Google Calendar sync for org bookings.
--
-- Stores OAuth tokens and calendar preferences per organization.
-- Sync direction: slotly → google (bookings create calendar events)
--                google → slotly (external events create blocked slots)
--
-- DOWN:
--   drop table google_calendar_syncs;
--   drop table google_calendar_events;

CREATE TABLE google_calendar_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    google_email TEXT NOT NULL,
    calendar_id TEXT NOT NULL DEFAULT 'primary',
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id)
);

-- Track which SKED bookings have been synced to Google Calendar
CREATE TABLE google_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id UUID NOT NULL REFERENCES google_calendar_syncs(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (sync_id, google_event_id)
);

CREATE INDEX idx_gcal_events_sync ON google_calendar_events(sync_id);
CREATE INDEX idx_gcal_events_booking ON google_calendar_events(booking_id);

ALTER TABLE google_calendar_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_can_manage_gcal" ON google_calendar_syncs
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'))
    WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "owners_can_view_gcal_events" ON google_calendar_events
    FOR SELECT
    USING (sync_id IN (
        SELECT id FROM google_calendar_syncs WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));
