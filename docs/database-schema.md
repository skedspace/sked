# Database Schema & Architecture

**Product:** SKED — Booking & Business Page Platform with Task-Gated Raffles
**Author:** Klein
**Status:** Draft v1
**Last updated:** 2026-07-25
**Engine:** PostgreSQL 15+ (via Supabase)

---

## Contents

1. [Architecture Principles](#1-architecture-principles)
2. [Schema Overview](#2-schema-overview)
3. [Table Definitions](#3-table-definitions)
4. [Indexes & Performance](#4-indexes--performance)
5. [Row-Level Security (RLS)](#5-row-level-security-rls)
6. [Exclusion Constraints (Double-Booking Prevention)](#6-exclusion-constraints)
7. [Security Definier Functions (Public Access)](#7-security-definier-functions)
8. [State Machines](#8-state-machines)
9. [Migration Strategy](#9-migration-strategy)
10. [Entity Relationship Summary](#10-entity-relationship-summary)

---

## 1. Architecture Principles

| Principle | Rationale |
|---|---|
| **Multi-tenant by org_id** | Every row that belongs to a business carries `org_id`. RLS policies filter by the user's memberships. No separate database per tenant. |
| **UTC everywhere, display at the edge** | All `TIMESTAMPTZ` columns stored in UTC. Timezone conversion happens in the API/presentation layer via `date-fns-tz`. The `locations.timezone` column drives conversion. |
| **Exclusion constraints, not application locks** | Double-booking prevention is a database-level exclusion constraint on `bookings(time_range, resource_id)`. No advisory locks, no Redis leases, no application-level mutex. |
| **Snapshots over joins** | `bookings.price_cents` copies the service price at booking time so historical accuracy survives price changes. Same pattern for entrant contact info on entries. |
| **Anonymous access via SECURITY DEFINER** | Public page visitors are unauthenticated. They read through Postgres functions using `SECURITY DEFINER` that expose only whitelisted columns — never direct table access. |
| **Soft deletes for audit** | Tables use `deleted_at TIMESTAMPTZ` rather than hard deletes where legal/compliance requires an audit trail. |
| **Payment provider events are idempotent** | Every payment event carries a unique provider-side ID that we store with a unique constraint to guarantee at-most-once processing. |

---

## 2. Schema Overview

The schema is organized into six domains:

```
┌─────────────────────────────────────────────────────┐
│                    ORGANIZATIONS                     │
│  organizations ──┐                                   │
│  org_members     │  (tenant root)                    │
├──────────────────┼──────────────────────────────────┤
│               LOCATION & AVAILABILITY                │
│  locations ──────┤                                   │
│  operating_hours ┤  (physical venue, schedule)       │
│  hour_overrides  ┘                                   │
├──────────────────┼──────────────────────────────────┤
│             SERVICES & BOOKING                       │
│  resources ──────┤                                   │
│  services ───────┤  (what gets booked)               │
│  service_resources                                  │
│  customers ──────┤                                   │
│  players ────────┤  (on-site players, linked to      │
│                  │   customers; used in board view,   │
│                  │   matches, tournaments, reports)   │
│  bookings ───────┤  (the core transaction)           │
│  payments ───────┤                                   │
├──────────────────┼──────────────────────────────────┤
│              MATCHES & TOURNAMENTS                   │
│  matches ────────┤                                   │
│  match_players ──┤  (player participation in matches) │
│  campaigns ──────┤                                   │
│  campaign_tasks ─┤                                   │
│  entrants ───────┤                                   │
│  task_completions                                    │
│  entries ────────┤                                   │
│  winners ────────┤                                   │
├──────────────────┼──────────────────────────────────┤
│              OBSERVABILITY                           │
│  audit_log ──────┤  (immutable action trail)         │
└──────────────────┴──────────────────────────────────┘
```

---

## 3. Table Definitions

### 3.1 Organizations

#### `organizations`
The tenant root. One paying customer (or free-tier user) = one organization.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `name` | `TEXT` | `NOT NULL` | Business name |
| `slug` | `TEXT` | `NOT NULL UNIQUE` | Used in public URL: `app.com/p/{slug}` |
| `plan` | `TEXT` | `NOT NULL DEFAULT 'free'` | `free`, `starter`, `pro` — decided once pricing is finalized (§10 Open Questions) |
| `logo_url` | `TEXT` | | Supabase Storage URL |
| `contact_email` | `TEXT` | | |
| `contact_phone` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |

#### `org_members`
Maps users to organizations with a role.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `org_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `user_id` | `UUID` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Supabase Auth user |
| `role` | `TEXT` | `NOT NULL DEFAULT 'staff'` | `owner`, `staff` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| | | `PRIMARY KEY (org_id, user_id)` | |

**RLS:** Every other table's RLS policy starts here: `org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())`.

---

### 3.2 Location & Availability

#### `locations`
A physical venue belonging to an organization.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `org_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `TEXT` | `NOT NULL` | e.g. "QC Main Branch" |
| `address` | `TEXT` | | |
| `lat` | `NUMERIC(10,7)` | | For future marketplace geo-indexing |
| `lng` | `NUMERIC(10,7)` | | |
| `timezone` | `TEXT` | `NOT NULL` | IANA timezone string, e.g. `Asia/Manila` |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

#### `operating_hours`
Weekly recurring schedule for a location.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `location_id` | `UUID` | `NOT NULL REFERENCES locations(id) ON DELETE CASCADE` | |
| `weekday` | `SMALLINT` | `NOT NULL CHECK (weekday BETWEEN 0 AND 6)` | 0=Sunday, 6=Saturday |
| `opens_at` | `TIME` | `NOT NULL` | Local time (location's timezone) |
| `closes_at` | `TIME` | `NOT NULL CHECK (closes_at > opens_at)` | |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| | | `UNIQUE (location_id, weekday)` | One row per weekday |

#### `hour_overrides`
Date-specific exceptions to operating hours (holidays, special events, closures).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `location_id` | `UUID` | `NOT NULL REFERENCES locations(id) ON DELETE CASCADE` | |
| `date` | `DATE` | `NOT NULL` | The specific date (local) |
| `opens_at` | `TIME` | | Null if `is_closed = true` |
| `closes_at` | `TIME` | `CHECK (closes_at > opens_at)` | |
| `is_closed` | `BOOLEAN` | `NOT NULL DEFAULT false` | If true, location is closed all day |
| `note` | `TEXT` | | e.g. "Christmas Day" |
| | | `UNIQUE (location_id, date)` | One override per date |

---

### 3.3 Services & Booking

#### `resources`
The bookable entity — a court, a studio set, a photographer, a table.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `org_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `location_id` | `UUID` | `NOT NULL REFERENCES locations(id) ON DELETE CASCADE` | |
| `name` | `TEXT` | `NOT NULL` | e.g. "Court 1", "Studio A", "Mike (Photographer)" |
| `type` | `TEXT` | `NOT NULL DEFAULT 'default'` | Discriminator for future extensibility |
| `capacity` | `INTEGER` | `NOT NULL DEFAULT 1` | Number of people the resource can accommodate |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

#### `services`
A sellable offering — what the customer buys.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `org_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `TEXT` | `NOT NULL` | e.g. "Court Rental (1 hr)", "Prenup Package (4 hrs)" |
| `duration_min` | `INTEGER` | `NOT NULL CHECK (duration_min > 0)` | Duration in minutes |
| `price_cents` | `INTEGER` | `NOT NULL CHECK (price_cents >= 0)` | Price in centavos (PHP) |
| `buffer_before_min` | `INTEGER` | `NOT NULL DEFAULT 0` | Minutes of gap needed before this booking |
| `buffer_after_min` | `INTEGER` | `NOT NULL DEFAULT 0` | Minutes of gap needed after this booking |
| `payment_mode` | `TEXT` | `NOT NULL DEFAULT 'full'` | `full`, `deposit`, `free` |
| `deposit_cents` | `INTEGER` | `CHECK (deposit_cents >= 0)` | Required deposit amount (if payment_mode='deposit') |
| `min_notice_min` | `INTEGER` | `NOT NULL DEFAULT 60` | Minimum minutes before booking time |
| `max_advance_days` | `INTEGER` | `NOT NULL DEFAULT 30` | How far in advance bookings are allowed |
| `service_category` | `TEXT` | | For future marketplace taxonomy |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

#### `service_resources`
Many-to-many: which resources can fulfill which services.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `service_id` | `UUID` | `NOT NULL REFERENCES services(id) ON DELETE CASCADE` | |
| `resource_id` | `UUID` | `NOT NULL REFERENCES resources(id) ON DELETE CASCADE` | |
| | | `PRIMARY KEY (service_id, resource_id)` | |

#### `customers`
People who book. Org-scoped, not global — each org has its own customer list.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `org_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `TEXT` | `NOT NULL` | |
| `email` | `TEXT` | | |
| `phone` | `TEXT` | | |
| `notes` | `TEXT` | | Owner's private notes |
| `no_show_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Tracks reliability |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

#### `bookings`
The core transaction. A service reserved against a resource for a time range.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `org_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `resource_id` | `UUID` | `NOT NULL REFERENCES resources(id)` | |
| `service_id` | `UUID` | `NOT NULL REFERENCES services(id)` | |
| `customer_id` | `UUID` | `NOT NULL REFERENCES customers(id)` | |
| `assigned_staff_id` | `UUID` | `REFERENCES org_members(user_id)` | Staff member assigned to this booking |
| `time_range` | `TSTZRANGE` | `NOT NULL` | Inclusive-exclusive range |
| `status` | `TEXT` | `NOT NULL DEFAULT 'held'` | See state machine §8 |
| `price_cents` | `INTEGER` | `NOT NULL` | Snapshot of service price at booking time |
| `source` | `TEXT` | `NOT NULL DEFAULT 'public'` | `public`, `manual`, `raffle` |
| `cancellation_reason` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Exclusion constraint:**
```sql
EXCLUDE USING gist (resource_id WITH =, time_range WITH &&)
    WHERE (status IN ('held', 'confirmed'))
```
This is the **single most important constraint in the database**. It prevents two bookings from having overlapping `time_range` values for the same `resource_id` when either booking is in `held` or `confirmed` status. This works even under concurrent INSERTs — the database guarantees it.

#### `payments`
Tracks payment transactions for bookings.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `booking_id` | `UUID` | `NOT NULL REFERENCES bookings(id)` | |
| `provider` | `TEXT` | `NOT NULL` | `paymongo`, `xendit` |
| `provider_ref` | `TEXT` | `NOT NULL UNIQUE` | Provider-side event/charge ID — idempotency key |
| `type` | `TEXT` | `NOT NULL` | `deposit`, `full`, `refund` |
| `amount_cents` | `INTEGER` | `NOT NULL CHECK (amount_cents >= 0)` | |
| `status` | `TEXT` | `NOT NULL DEFAULT 'pending'` | `pending`, `succeeded`, `failed`, `refunded` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Idempotency:** The `provider_ref` unique constraint ensures that webhook replays or out-of-order delivery from the payment provider never double-count a payment.

---

### 3.4 Players

#### `players`
On-site players registered at the facility. Every customer who books is automatically also created as a player (if they don't already exist). Players can also be added manually on-site via the Session Control dashboard. Player data drives the board view, matches, tournaments, and reports.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `org_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `customer_id` | `UUID` | `REFERENCES customers(id) ON DELETE SET NULL` | Links back to the customer who booked — null if added on-site without booking |
| `name` | `TEXT` | `NOT NULL` | |
| `email` | `TEXT` | | |
| `phone` | `TEXT` | | |
| `skill_level` | `NUMERIC(2,1)` | `NOT NULL DEFAULT 2.0 CHECK (skill_level >= 1.0 AND skill_level <= 5.0)` | 1.0–5.0 scale. Default 2.0 = Beginner. Customers who book get this default unless overridden |
| `play_style` | `TEXT` | `NOT NULL DEFAULT 'All Court Player'` | e.g. All Court Player, Aggressive Baseline, Serve & Volley |
| `status` | `TEXT` | `NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))` | |
| `birthday` | `DATE` | | |
| `notes` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Indexes:**
```sql
CREATE INDEX idx_players_org_status ON players(org_id, status);
CREATE INDEX idx_players_org_skill ON players(org_id, skill_level);
CREATE INDEX idx_players_customer ON players(customer_id);
```

**RLS:** Tenant isolation policy applied.

#### `match_players`
Links players to matches (many-to-many) with team assignment and result.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `org_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `match_id` | `UUID` | `NOT NULL REFERENCES matches(id) ON DELETE CASCADE` | |
| `player_id` | `UUID` | `NOT NULL REFERENCES players(id) ON DELETE CASCADE` | |
| `team` | `TEXT` | `CHECK (team IN ('a', 'b'))` | Which team the player is assigned to |
| `result` | `TEXT` | `CHECK (result IN ('win', 'loss', 'draw'))` | Match outcome for this player |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| | | `UNIQUE (match_id, player_id)` | A player can only appear once per match |

---

### 3.5 Public Page

#### `pages`
The public-facing storefront configuration for an organization. One row per org.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `org_id` | `UUID` | `PK REFERENCES organizations(id) ON DELETE CASCADE` | One-to-one with org |
| `theme` | `TEXT` | `NOT NULL DEFAULT 'default'` | Theme identifier |
| `sections` | `JSONB` | `NOT NULL DEFAULT '[]'` | Ordered array of page sections (hero, services, about, etc.) |
| `cover_url` | `TEXT` | | Cover image URL (Supabase Storage) |
| `logo_url` | `TEXT` | | |
| `bio` | `TEXT` | | Short description shown on the page |
| `socials` | `JSONB` | `DEFAULT '{}'` | `{facebook, instagram, tiktok, website}` |
| `is_published` | `BOOLEAN` | `NOT NULL DEFAULT false` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Public access:** Anonymous visitors read via `get_public_page(slug)` SECURITY DEFINER function (see §7), never directly.

---

### 3.5 Campaigns & Raffles *(Future Feature — Schema Pre-built)*

The tables in this section are fully defined in the schema for forward-compatibility but will not be built until post-v1. See the PRD §8 (Nice-to-Have & Future Scope) for timing. They are documented here so the architecture can be reviewed and validated before implementation begins.

#### `campaigns`
A giveaway/raffle attached to a public page.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `org_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `slug` | `TEXT` | `NOT NULL` | URL-friendly identifier, unique per org |
| `title` | `TEXT` | `NOT NULL` | e.g. "Win 10 Free Court Sessions!" |
| `prize` | `TEXT` | `NOT NULL` | Description of the prize |
| `image_url` | `TEXT` | | Prize or campaign image |
| `starts_at` | `TIMESTAMPTZ` | `NOT NULL` | Campaign start |
| `ends_at` | `TIMESTAMPTZ` | `NOT NULL CHECK (ends_at > starts_at)` | Campaign end |
| `winner_count` | `INTEGER` | `NOT NULL DEFAULT 1` | Number of winners to draw |
| `status` | `TEXT` | `NOT NULL DEFAULT 'draft'` | See state machine §8 |
| `rules_md` | `TEXT` | | Markdown rules displayed to entrants |
| `commitment_hash` | `TEXT` | | SHA-256 of (entry_list + server_seed) — published before draw |
| `server_seed` | `TEXT` | | Revealed after draw for verifiability |
| `drawn_at` | `TIMESTAMPTZ` | | When the draw executed |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| | | `UNIQUE (org_id, slug)` | |

#### `campaign_tasks`
Actions entrants complete to earn entries.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `campaign_id` | `UUID` | `NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE` | |
| `type` | `TEXT` | `NOT NULL` | `follow`, `share`, `phone_verify`, `referral`, `quiz`, `book_slot` |
| `config` | `JSONB` | `NOT NULL DEFAULT '{}'` | Type-specific config (e.g. quiz questions, target URL) |
| `entry_value` | `INTEGER` | `NOT NULL DEFAULT 1` | How many entries this task grants |
| `is_required` | `BOOLEAN` | `NOT NULL DEFAULT false` | Must this be completed to qualify? |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | Display order |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Method discriminator:** The `type` column allows new task-verification methods (e.g. `oauth_facebook` in the future) to be added as new rows rather than schema changes. See PRD §7.3.

#### `entrants`
People who enter a campaign.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `campaign_id` | `UUID` | `NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE` | |
| `name` | `TEXT` | `NOT NULL` | |
| `email` | `TEXT` | | |
| `phone` | `TEXT` | | |
| `phone_verified_at` | `TIMESTAMPTZ` | | |
| `referral_code` | `TEXT` | `UNIQUE` | Unique code for referral tracking |
| `referred_by` | `TEXT` | | Referral code of the referrer |
| `marketing_opt_in` | `BOOLEAN` | `NOT NULL DEFAULT false` | Separate consent, not bundled with entry |
| `ip_hash` | `TEXT` | | Hashed IP for abuse clustering (not stored raw) |
| `status` | `TEXT` | `NOT NULL DEFAULT 'active'` | `active`, `disqualified` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

#### `task_completions`
Records each task an entrant completes.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `entrant_id` | `UUID` | `NOT NULL REFERENCES entrants(id) ON DELETE CASCADE` | |
| `task_id` | `UUID` | `NOT NULL REFERENCES campaign_tasks(id) ON DELETE CASCADE` | |
| `proof` | `JSONB` | | Type-specific proof data (share URL, screenshot URL, quiz answers) |
| `status` | `TEXT` | `NOT NULL DEFAULT 'pending'` | `pending`, `approved`, `rejected` |
| `reviewed_by` | `UUID` | `REFERENCES org_members(user_id)` | Owner who reviewed (for manual tasks) |
| `reviewed_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| | | `UNIQUE (entrant_id, task_id)` | One completion per task per entrant |

#### `entries`
One row per ticket in the draw. An entrant can hold many entries.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `campaign_id` | `UUID` | `NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE` | |
| `entrant_id` | `UUID` | `NOT NULL REFERENCES entrants(id) ON DELETE CASCADE` | |
| `task_completion_id` | `UUID` | `REFERENCES task_completions(id)` | Which task generated this entry (nullable for bonus/referral entries) |
| `ticket_number` | `INTEGER` | `NOT NULL` | Sequential number within campaign — used in provably fair draw |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| | | `UNIQUE (campaign_id, ticket_number)` | |

#### `winners`
Outcome of the raffle draw.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `campaign_id` | `UUID` | `NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE` | |
| `entrant_id` | `UUID` | `NOT NULL REFERENCES entrants(id)` | |
| `prize_rank` | `INTEGER` | `NOT NULL` | 1st, 2nd, 3rd, etc. |
| `claimed_at` | `TIMESTAMPTZ` | | |
| `expires_at` | `TIMESTAMPTZ` | | Claim deadline — auto re-draw if expired |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| | | `UNIQUE (campaign_id, prize_rank)` | |

---

### 3.6 Observability

#### `audit_log`
Immutable trail of important actions within an organization.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGSERIAL` | `PK` | Sequential for ordering |
| `org_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `actor_id` | `UUID` | `NOT NULL REFERENCES auth.users(id)` | Who performed the action |
| `action` | `TEXT` | `NOT NULL` | e.g. `booking.created`, `booking.cancelled`, `campaign.draw` |
| `target` | `TEXT` | | Entity type + ID, e.g. `booking:abc-123` |
| `payload` | `JSONB` | `DEFAULT '{}'` | Action-specific data (previous state, reason, etc.) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Immutability:** No UPDATE or DELETE privileges are granted on this table except by a maintenance function with restricted access.

---

## 4. Indexes & Performance

### 4.1 Core Indexes

```sql
-- Bookings — the hottest table
CREATE INDEX idx_bookings_resource_time
    ON bookings(resource_id, time_range)
    WHERE status IN ('held', 'confirmed');
CREATE INDEX idx_bookings_org_status
    ON bookings(org_id, status);
CREATE INDEX idx_bookings_customer
    ON bookings(customer_id);
CREATE INDEX idx_bookings_date
    ON bookings(org_id, (lower(time_range)::date));

-- Customers
CREATE INDEX idx_customers_org_email
    ON customers(org_id, email)
    WHERE email IS NOT NULL;
CREATE INDEX idx_customers_org_phone
    ON customers(org_id, phone)
    WHERE phone IS NOT NULL;

-- Availability lookups (for slot generation)
CREATE INDEX idx_operating_hours_location
    ON operating_hours(location_id, weekday);
CREATE INDEX idx_hour_overrides_location_date
    ON hour_overrides(location_id, date);

-- Campaigns
CREATE INDEX idx_campaigns_org_slug
    ON campaigns(org_id, slug);
CREATE INDEX idx_campaigns_status_dates
    ON campaigns(status, starts_at, ends_at);

-- Entries (for draw)
CREATE INDEX idx_entries_campaign_ticket
    ON entries(campaign_id, ticket_number);

-- Winners notification
CREATE INDEX idx_winners_campaign_claimed
    ON winners(campaign_id, claimed_at);

-- Audit log
CREATE INDEX idx_audit_log_org_created
    ON audit_log(org_id, created_at DESC);

-- Entrant deduplication
CREATE INDEX idx_entrants_campaign_phone
    ON entrants(campaign_id, phone)
    WHERE phone IS NOT NULL;
CREATE INDEX idx_entrants_campaign_email
    ON entrants(campaign_id, email)
    WHERE email IS NOT NULL;
CREATE INDEX idx_entrants_ip_hash
    ON entrants(campaign_id, ip_hash)
    WHERE ip_hash IS NOT NULL;
```

### 4.2 Performance Notes

- **Exclusion constraints** require a GiST index, which is created automatically by the `EXCLUDE USING gist` clause.
- The `idx_bookings_resource_time` partial index covers the most common query: "is this slot available?".
- `tstzrange` columns are indexed with GiST, which supports `&&` (overlap) and `@>` (contains) operators efficiently.
- JSONB columns (`sections`, `config`, `payload`, `socials`) are not indexed by default. Only add JSONB indexes when query patterns emerge in production.
- Indexes on `entrants` phone/email/IP are for duplicate detection queries, which are admin-facing and low-frequency.

---

## 5. Row-Level Security (RLS)

### 5.1 Policy Pattern

Every table carrying `org_id` uses the same RLS policy pattern:

```sql
-- Each table gets this policy (parameterized by table name)
CREATE POLICY tenant_isolation ON <table_name>
    USING (org_id IN (
        SELECT org_id FROM org_members
        WHERE user_id = auth.uid()
    ));
```

### 5.2 Per-Table RLS Summary

| Table | RLS Enabled? | Policy | Notes |
|---|---|---|---|
| `organizations` | Yes | Owner sees their org; staff cannot see org list | Separate policy for `SELECT` vs `UPDATE` |
| `org_members` | Yes | Users see their own memberships; owners see all for their org | |
| `locations` | Yes | Tenant isolation by org_id | |
| `operating_hours` | Yes | Joined through location → org | |
| `hour_overrides` | Yes | Joined through location → org | |
| `resources` | Yes | Tenant isolation by org_id | |
| `services` | Yes | Tenant isolation by org_id | |
| `service_resources` | Yes | Joined through service → org | |
| `customers` | Yes | Tenant isolation by org_id | |
| `bookings` | Yes | Tenant isolation by org_id | |
| `payments` | Yes | Joined through booking → org | |
| `pages` | Yes | One-to-one with org | |
| `campaigns` | Yes | Tenant isolation by org_id | |
| `campaign_tasks` | Yes | Joined through campaign → org | |
| `entrants` | Yes | Joined through campaign → org | Owner can see entrants; entrants themselves cannot |
| `task_completions` | Yes | Joined through campaign → org | |
| `entries` | Yes | Joined through campaign → org | |
| `winners` | Yes | Joined through campaign → org | |
| `audit_log` | Yes | Insert-only for all; select for owners only | |

### 5.3 Service Role Restriction

No API route uses the `service_role` key except:
1. A small, reviewed server-only module for administrative tasks
2. Supabase Edge Functions for payment webhook processing (which need to write across org boundaries)
3. Cron job functions

These are audited separately. All other requests use the `anon` key with RLS.

---

## 6. Exclusion Constraints

### 6.1 Double-Booking Prevention

```sql
-- This is THE constraint that makes the product work
ALTER TABLE bookings
ADD CONSTRAINT no_overlap_when_held_or_confirmed
EXCLUDE USING gist (
    resource_id WITH =,
    time_range WITH &&
)
WHERE (status IN ('held', 'confirmed'));
```

**How it works:**
- `resource_id WITH =` — only check rows for the same resource
- `time_range WITH &&` — check if ranges overlap (the `&&` operator means "intersects")
- `WHERE (status IN ('held', 'confirmed'))` — only enforce for active bookings
- Cancelled/completed bookings don't block availability

**This handles:**
- Two customers simultaneously booking the exact same slot → one succeeds, one gets a Postgres error → API translates to "slot no longer available"
- A long booking and a short booking that overlap → blocked
- Manual admin booking that conflicts with an existing one → blocked at the DB level, not in JS

### 6.2 Buffer Enforcement

Buffers (`buffer_before_min`, `buffer_after_min`) are **not** enforced at the exclusion-constraint level because they are service-level, not resource-level, and they would require computed ranges. Instead:

1. When generating available slots, the system subtracts buffers from the resource's free time.
2. When creating a booking, the system checks that the requested `time_range` does not violate the service's buffer requirements against any existing confirmed booking on the same resource.
3. This check happens in a transaction immediately before INSERT, but the exclusion constraint is the ultimate guarantee.

---

## 7. Security Definier Functions (Public Access)

Anonymous visitors (entrants, customers browsing a page) must **never** touch base tables directly. All public reads go through `SECURITY DEFINER` functions.

### 7.1 Public Page Data

```sql
CREATE OR REPLACE FUNCTION get_public_page(page_slug TEXT)
RETURNS TABLE (
    org_name TEXT,
    org_slug TEXT,
    bio TEXT,
    cover_url TEXT,
    logo_url TEXT,
    socials JSONB,
    sections JSONB,
    theme TEXT,
    services JSON,
    campaigns JSON
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Resolve org from slug
    SELECT id INTO v_org_id
    FROM organizations
    WHERE slug = page_slug AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        o.name,
        o.slug,
        p.bio,
        p.cover_url,
        p.logo_url,
        p.socials,
        p.sections,
        p.theme,
        -- Exposed services (only active, with minimal fields)
        (SELECT json_agg(json_build_object(
            'id', s.id,
            'name', s.name,
            'duration_min', s.duration_min,
            'price_cents', s.price_cents,
            'payment_mode', s.payment_mode,
            'deposit_cents', s.deposit_cents
        ))
        FROM services s
        WHERE s.org_id = v_org_id AND s.is_active),
        -- Active campaigns (limited fields)
        (SELECT json_agg(json_build_object(
            'id', c.id,
            'slug', c.slug,
            'title', c.title,
            'prize', c.prize,
            'image_url', c.image_url,
            'starts_at', c.starts_at,
            'ends_at', c.ends_at
        ))
        FROM campaigns c
        WHERE c.org_id = v_org_id AND c.status = 'active')
    FROM organizations o
    JOIN pages p ON p.org_id = o.id
    WHERE o.id = v_org_id;
END;
$$;
```

### 7.2 Available Slots Query

```sql
CREATE OR REPLACE FUNCTION get_available_slots(
    p_org_slug TEXT,
    p_service_id UUID,
    p_date DATE
)
RETURNS TABLE (start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, resource_id UUID, resource_name TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
-- Complex slot-generation logic:
-- 1. Resolve org from slug
-- 2. Get the service + its duration/buffers
-- 3. Get resources that can fulfill this service
-- 4. Get operating hours for the given date's weekday
-- 5. Check hour_overrides
-- 6. Generate slot candidates from operating hours
-- 7. Subtract existing bookings (held/confirmed) with buffers
-- 8. Apply min_notice and max_advance
-- 9. Return remaining slots
$$;
```

---

## 8. State Machines

### 8.1 Booking States

```
                  ┌──────────┐
                  │   held   │  (temp hold during checkout, expires in N min)
                  └────┬─────┘
                       │
                  ┌────▼─────┐         ┌───────────┐
                  │ confirmed │◄────────│  pending  │  (if payment required)
                  └────┬─────┘         └────▲───────┘
                       │                    │
                  ┌────▼─────┐         ┌────┴───────┐
                  │ completed│         │  cancelled  │
                  └──────────┘         └────────────┘

Transitions:
  held → confirmed    (checkout completed or free booking)
  held → cancelled    (hold expired or owner cancelled)
  held → pending      (payment initiated)
  pending → confirmed (payment succeeded)
  pending → cancelled (payment failed or expired)
  confirmed → completed (service rendered)
  confirmed → cancelled (owner or customer cancels)
  pending → confirmed → cancelled possible at any stage
```

### 8.2 Campaign States

```
  draft ──► scheduled ──► active ──► drawing ──► drawn ──► completed
                    │                    │
                    └──► cancelled        └──► cancelled
                      (before draw)          (draw failed)

  draft      — Owner is configuring
  scheduled  — Start date set, not yet live
  active     — Entrants can enter
  drawing    — Draw in progress (lock)
  drawn      — Winners selected, verification published
  completed  — All prizes claimed or expired, campaign closed
  cancelled  — Owner cancelled before/during draw
```

---

## 9. Migration Strategy

### 9.1 Tooling

- **Supabase Migrations** — SQL files in `supabase/migrations/` with timestamp prefixes.
- **Local development** — `supabase start` for local Postgres, migrations run automatically.
- **CI** — `supabase db push` on feature branches (preview deploys).
- **Production** — `supabase db push` after review (no auto-migrate).

### 9.2 Migration Principles

1. **Every migration is reversible** — include a `-- DOWN:` comment block with the rollback SQL.
2. **Additive-only** for existing tables: add columns as nullable or with defaults, never drop columns in the same migration that creates them.
3. **Exclusion constraints after data** — add the booking exclusion constraint in a separate migration after the bookings table has data, to verify no existing conflicts.
4. **One concern per migration** — schema changes, data backfills, and index creation are separate files.
5. **Migration naming convention:**
   ```
   00001_create_organizations.sql
   00002_create_locations.sql
   00003_create_resources_services.sql
   00004_create_bookings_exclusion_constraint.sql
   00005_create_pages.sql
   00006_create_campaigns.sql
   00007_create_raffle_tables.sql
   00008_create_audit_log.sql
   00009_create_indexes.sql
   00010_create_rls_policies.sql
   00011_create_public_functions.sql
   ```

### 9.3 Seed Data

A `supabase/seed.sql` file creates:
- A demo organization with two locations
- Operating hours (Mon-Sat, 8am-8pm)
- A pickleball court resource
- Two services ("Court Rental 1hr" at ₱200, "Court Rental 2hr" at ₱350)
- A basic published page
- A test campaign with tasks

This lets the developer see a working page at `app.com/p/demo-pickleball` immediately after `supabase start`.

---

## 10. Entity Relationship Summary

```
organizations 1──N org_members
organizations 1──N locations
organizations 1──N resources
organizations 1──N services
organizations 1──N customers
organizations 1──N players
organizations 1──N matches
organizations 1──N campaigns
organizations 1──1 pages

locations     1──N operating_hours
locations     1──N hour_overrides
locations     1──N resources

services      N──M resources       (via service_resources)
services      1──N bookings

resources     1──N bookings
resources     1──N matches          (optional FK)

customers     1──N bookings
customers     1──O players          (optional — a customer may or may not have a linked player)

players       1──N match_players
players       O──1 customers        (a player may or may not have a linked customer)

matches       1──N match_players
bookings      0──N payments
bookings      N──1 org_members     (assigned_staff_id)

campaigns     1──N campaign_tasks
campaigns     1──N entrants
campaigns     1──N entries
campaigns     1──N winners

entrants      1──N task_completions
entrants      1──N entries
entrants      0──1 entrants        (referred_by self-ref)

campaign_tasks 1──N task_completions
task_completions 1──N entries      (nullable FK)

organizations 1──N audit_log
```

---

## Appendix A: Key Design Decisions

| Decision | Rationale |
|---|---|
| `TSTZRANGE` over separate `start_time`/`end_time` columns | Enables the exclusion constraint that prevents double-booking; range operators (`&&`, `@>`) are more expressive for availability queries |
| Price snapshot on `bookings.price_cents` | A booking's price should reflect what the customer agreed to, even if the service price changes later |
| `org_id` on every table (denormalized) | Simplifies RLS policies — no multi-joins to determine org membership; slightly denormalized but saves complex policy definitions |
| Sequential `ticket_number` per campaign | Enables the provably-fair draw algorithm: sort by ticket number, hash with server seed, select winners deterministically |
| `provider_ref` unique constraint | Payment webhooks can arrive multiple times or out of order; idempotency at the DB level is the simplest guarantee |
| Soft deletes on organizations only | Most data is org-scoped and cascade-deleted when the org is removed; separate GDPR deletion paths for entrant PII |

---

## Appendix B: Provably Fair Draw Algorithm

```sql
-- 1. Before draw: publish commitment hash
-- commitment_hash = SHA-256(server_seed || ':' || SHA-256(sorted_ticket_numbers))

-- 2. During draw: deterministic winner selection
CREATE OR REPLACE FUNCTION draw_campaign_winners(p_campaign_id UUID)
RETURNS SETOF winners
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_server_seed TEXT;
    v_winner_count INT;
    v_entry_ids INT[];
    v_selected INT[];
    v_idx INT;
BEGIN
    -- Lock the campaign to prevent concurrent draws
    SELECT server_seed, winner_count INTO v_server_seed, v_winner_count
    FROM campaigns
    WHERE id = p_campaign_id AND status = 'active'
    FOR UPDATE;

    -- Get all entry IDs sorted by ticket number
    v_entry_ids := ARRAY(
        SELECT id FROM entries
        WHERE campaign_id = p_campaign_id
        ORDER BY ticket_number
    );

    -- Deterministic selection using HMAC-based ordering
    -- For each winner position, compute HMAC(seed || position, entry_list)
    -- This is reproducible by anyone with the seed and entry list
    FOR i IN 1..v_winner_count LOOP
        -- Selecting algorithm: use HMAC to pick a deterministic index
        -- from the remaining (unselected) entries
        v_idx := (get_byte(hmac(
            (v_server_seed || ':' || i::TEXT)::bytea,
            array_to_string(v_entry_ids, ',')::bytea,
            'sha256'
        ), 0)::INT % array_length(v_entry_ids, 1)) + 1;

        -- Insert winner
        INSERT INTO winners (campaign_id, entrant_id, prize_rank)
        SELECT p_campaign_id, entrant_id, i
        FROM entries
        WHERE id = v_entry_ids[v_idx];

        -- Remove selected entry from pool
        v_entry_ids := v_entry_ids[1:v_idx-1] || v_entry_ids[v_idx+1:];
    END LOOP;

    -- Update campaign status
    UPDATE campaigns
    SET status = 'drawn', drawn_at = now()
    WHERE id = p_campaign_id;
END;
$$;
```

The user-facing verification page then publishes the server seed, the full entry list, and the algorithm so anyone can independently verify the draw.

---

## Appendix C: RLS Policy Generator (Pattern)

Since most tables share the same RLS pattern, a helper script generates policies:

```sql
-- Generate RLS for all org-scoped tables
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'locations', 'resources', 'services', 'service_resources',
        'customers', 'bookings', 'payments', 'campaigns',
        'campaign_tasks', 'entrants', 'task_completions', 'entries', 'winners'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format(
            'ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t
        );
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I
             USING (org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
             ));', t
        );
        -- Staff can read but only owners can write (separate policy)
        EXECUTE format(
            'CREATE POLICY owner_write ON %I
             FOR INSERT WITH CHECK (
                org_id IN (
                    SELECT org_id FROM org_members
                    WHERE user_id = auth.uid() AND role = ''owner''
                )
             );', t
        );
    END LOOP;
END;
$$;
```

---

*This document is a living reference. Update table definitions, indexes, and policies as the schema evolves through migrations.*
