-- Migration: 00026_create_reviews.sql
-- Customer reviews and moderation state for the reviews dashboard.

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    source TEXT NOT NULL DEFAULT 'web_app'
        CHECK (source IN ('web_app', 'mobile_app', 'google', 'facebook', 'manual')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('published', 'pending', 'unpublished', 'flagged')),
    response TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_org ON reviews(org_id);
CREATE INDEX idx_reviews_org_status ON reviews(org_id, status);
CREATE INDEX idx_reviews_org_rating ON reviews(org_id, rating);
CREATE INDEX idx_reviews_reviewed_at ON reviews(org_id, reviewed_at);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);
CREATE INDEX idx_reviews_resource ON reviews(resource_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_members_can_view_reviews ON reviews
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY org_members_can_manage_reviews ON reviews
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()))
    WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
