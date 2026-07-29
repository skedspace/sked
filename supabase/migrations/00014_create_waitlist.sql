-- Migration: 00014_create_waitlist.sql
-- Customers can join a waitlist when their desired slot is taken,
-- and get notified when the slot reopens.
--
-- DOWN: drop table waitlist_entries;

CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    desired_date DATE NOT NULL,
    desired_start_time TIME NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'expired', 'cancelled')),
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_org ON waitlist_entries(org_id, resource_id, desired_date, status);
CREATE INDEX idx_waitlist_customer ON waitlist_entries(customer_id);

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_waitlist" ON waitlist_entries
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "owners_can_manage_waitlist" ON waitlist_entries
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'))
    WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'));

-- Public insert policy: anyone can join a waitlist
CREATE POLICY "anyone_can_join_waitlist" ON waitlist_entries
    FOR INSERT
    WITH CHECK (true);

-- Function: find waiting customers when a booking is cancelled
CREATE OR REPLACE function notify_waitlist_for_slot(
    p_org_id UUID,
    p_resource_id UUID,
    p_service_id UUID,
    p_desired_date DATE,
    p_desired_start_time TIME
)
RETURNS TABLE (
    entry_id UUID,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH next_entry AS (
        SELECT id
        FROM waitlist_entries
        WHERE org_id = p_org_id
          AND resource_id = p_resource_id
          AND service_id = p_service_id
          AND desired_date = p_desired_date
          AND desired_start_time = p_desired_start_time
          AND status = 'waiting'
        ORDER BY created_at ASC
        LIMIT 1
    )
    UPDATE waitlist_entries
    SET status = 'notified',
        notified_at = now()
    FROM next_entry
    WHERE waitlist_entries.id = next_entry.id
    RETURNING
        waitlist_entries.id,
        waitlist_entries.customer_name,
        waitlist_entries.customer_email,
        waitlist_entries.customer_phone;
END;
$$;
