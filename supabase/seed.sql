-- Seed: Demo data for local development
-- Run with: supabase db reset

-- Create a demo organization
INSERT INTO organizations (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Marco''s Pickleball Courts', 'marco-pickleball', 'free');

-- Wait for a real auth user to be created, then link them:
-- INSERT INTO org_members (org_id, user_id, role)
-- VALUES ('00000000-0000-0000-0000-000000000001', '<USER_ID>', 'owner');

-- Demo location
INSERT INTO locations (id, org_id, name, address, timezone)
VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'QC Main Branch', '123 Sct. Madriñan St., Quezon City', 'Asia/Manila');

-- Operating hours (Mon-Sat 7am-9pm, Sun closed)
INSERT INTO operating_hours (location_id, weekday, opens_at, closes_at)
SELECT '00000000-0000-0000-0000-000000000010', weekday, '07:00'::TIME, '21:00'::TIME
FROM generate_series(1, 6) AS weekday; -- Mon=1 to Sat=6

-- Demo resources (3 courts)
INSERT INTO resources (id, org_id, location_id, name, capacity)
VALUES
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Court 1', 4),
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Court 2', 4),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Court 3', 4);

-- Demo services
INSERT INTO services (id, org_id, name, duration_min, price_cents, buffer_before_min, buffer_after_min, payment_mode)
VALUES
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'Court Rental (1 hr)', 60, 35000, 15, 15, 'free'),
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Court Rental (2 hr)', 120, 65000, 15, 15, 'free'),
    ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'Open Play (2 hr)', 120, 25000, 15, 15, 'free');

-- Link services to all three courts
INSERT INTO service_resources (service_id, resource_id)
SELECT s.id, r.id
FROM services s
CROSS JOIN resources r
WHERE s.org_id = '00000000-0000-0000-0000-000000000001'
  AND r.org_id = '00000000-0000-0000-0000-000000000001';

-- Demo page
INSERT INTO pages (org_id, theme, bio, socials, is_published)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'default',
    'QC''s premier pickleball courts. Book a court, grab a paddle, and play! Open daily 7am–9pm.',
    '{"facebook": "https://facebook.com/marcopickleball", "instagram": "https://instagram.com/marcopickleball"}',
    true
);
