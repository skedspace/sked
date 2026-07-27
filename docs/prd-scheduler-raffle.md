# PRD — Interactive Scheduling Dashboard & Business Page Platform

**Working name:** TBD (placeholder: *SKED*)
**Author:** Klein
**Status:** Draft v1
**Last updated:** 2026-07-25

---

## Table of Contents

- [1. Problem Statement](#1-problem-statement)
- [1.5. Competitive Context](#15-competitive-context)
- [2. Goals](#2-goals)
- [3. Non-Goals (v1)](#3-non-goals-v1)
- [4. Target Users & Personas](#4-target-users--personas)
- [5. Core Concepts & Glossary](#5-core-concepts--glossary)
- [5.5. Design Principles & UX](#55-design-principles--ux)
- [6. User Stories & Requirements](#6-user-stories--requirements)
- [7. Edge Cases & Error States](#7-edge-cases--error-states)
- [8. Nice-to-Have & Future Scope](#8-nice-to-have--future-scope)
- [9. Technical Design](#9-technical-design)
- [10. Success Metrics](#10-success-metrics)
- [11. Open Questions](#11-open-questions)
- [12. Phasing](#12-phasing)
- [13. Parking Lot](#13-parking-lot)

---

## 1. Problem Statement

Small local businesses that sell *time* — pickleball and badminton court owners, photography studios, tattoo artists, tutors, salons — currently run bookings through Facebook Messenger, group chats, and a notebook or a shared Google Sheet. Double-bookings, no-shows, and manual deposit chasing are constant, and the owner is the only person who knows the real schedule.

The existing alternatives are either too heavy and expensive for a two-court operation, or built for Western payment rails and don't handle GCash, walk-ins, or "reserve now, pay half on arrival."

Most of these businesses have no website at all — just a Facebook page. They have no way to present their services, show their availability, and let customers book without DMs and phone calls.

**The bet:** every business deserves a beautiful marketing page that doubles as their booking system. A single link an owner can put in their bio — it shows who they are, what they offer, and lets customers book directly. No website builder. No code. No "contact us for rates."

---

## 1.5. Competitive Context

**Who else is in this space, and why build at all?**

### Existing Booking Tools
| Product | Focus | PH-Relevant? | Key Gaps |
|---|---|---|---|
| **SimplyBook.me** | General service booking | Yes, GCash via PayMongo | Expensive for small operations; heavy feature set for simple use cases |
| **Square Appointments** | Salon & studio | No GCash, no PH payout | Effectively unavailable for PH market |
| **Setmore** | General booking | Free tier, no GCash | No PH payment rails |
| **Facebook Booking** | Meta-native | Yes, but extremely limited | No resource management, no double-book prevention |
| **Calendly / Acuity** | Time slots / pros | No payments, no resource mgmt | Built for individual schedulers, not businesses with multiple resources |
| **CourtReserve / PlaybyPoint** | Court-specific | US-focused, expensive | No PH payment rails |
| **Google Business Profile** | Local listing | Yes | Booking is clunky or non-existent; no resource scheduling |

**SKED's differentiation:** A mobile-first, instantly published marketing + booking page that works for Philippine businesses. No setup fees, no Western-gateway lock-in. The public page is a real storefront — cover image, bio, services, socials — not a bare booking form. It's the business website they never had, built in 10 minutes and shared as a single link.

---

## 2. Goals

| # | Goal | Measure of success |
|---|---|---|
| G1 | A new business owner can go from signup to a live, shareable booking page in under 10 minutes without help | Median time-to-first-published-page < 10 min; 60% of signups publish |
| G2 | Eliminate double-bookings and manual schedule reconciliation | Zero overlapping confirmed bookings per resource (hard DB constraint); < 1% booking disputes |
| G3 | The public page acts as a real storefront that drives bookings, not just a form | ≥ 40% of page visitors interact with the scheduler; ≥ 20% complete a booking |
| G4 | Convert free users to paid on volume, not on feature starvation | ≥ 8% free→paid conversion by month 3 |

**User goal:** stop losing time and money to manual coordination. Have a professional web presence without learning a website builder.
**Business goal:** become the default way local PH businesses put themselves online. Own the simple link-in-bio + booking use case that Facebook can't serve well.

---

## 3. Non-Goals (v1)

| Non-goal | Why |
|---|---|
| Native mobile apps (iOS/Android) | The public page is a link people open from Facebook; a fast PWA-quality web app covers it. Revisit after 1k active businesses. |
| Full POS / inventory / retail sales | Different product. Court owners selling shuttlecocks can log it as an add-on line item, nothing more. |
| Payroll, staff scheduling, HR | Adjacent but a separate initiative. v1 tracks *who is assigned* to a booking, not their hours or pay. |
| Raffles, giveaways, and contests | Social giveaways are a potential future feature, but building them before the core booking experience is proven would split focus. See §8 (Nice-to-Have). |
| Marketplace / discovery directory | We are not building "find a court near you" in v1. Every business brings its own traffic. Building a marketplace changes the business model and the moat. |
| Multi-currency and international tax | PH-first. PHP only, VAT-inclusive display, no invoicing compliance module. |

---

## 4. Target Users & Personas

**Primary — the Owner-Operator (Marco, 34, owns 3 pickleball courts in QC).**
Runs the business from his phone. Has a Facebook page with 4k followers, no website. Uses GCash for deposits. Technical ceiling: can use Canva and Google Sheets. He is the buyer, the admin, and often the person taking the booking.

**Secondary — the Studio Manager (Bea, 28, photography studio).**
Manages a calendar for 2 photographers and 2 sets. Needs bookings that vary in duration (30-min headshots vs. 4-hour prenup), require prep/cleanup buffers, and involve deposits before the date is held.

**Tertiary — the Staff Member.**
Front desk / assistant coach. Needs to see today's schedule, check people in, and add a walk-in. Must *not* see revenue reports, other staff's details, or settings.

**Quaternary — the Customer/Entrant.**
Arrives from a Facebook link on mobile data. Will abandon anything that requires creating an account before seeing prices. Enters the raffle first, books later — or vice versa.

---

## 5. Core Concepts & Glossary

Establishing vocabulary before requirements, since these names should carry into the schema and codebase. Terms marked with **★** are database entities.

### Business Entities

- **★ Organization** — the paying tenant. Has one or more Locations.
- **★ Location** — a physical venue with its own address, timezone, and operating hours.
- **★ Resource** — the bookable thing. A court, a studio set, a photographer, a table. The core abstraction that lets one product serve pickleball and photography without forking.
- **★ Service** — what a customer buys: "Court rental (1 hr)", "Prenup package (4 hrs)". Defines duration, price, buffer, and which Resources can fulfill it.
- **★ Service-Resource link** — which Resources are qualified to provide which Services (many-to-many).
- **Availability** — computed, not stored. Derived from operating hours, overrides, and existing bookings.

### Booking & Customer

- **★ Booking** — a Service reserved against a Resource for a time range, held by a Customer. Statuses: `held` → `confirmed` → `completed` | `cancelled` | `no_show`.
- **★ Customer** — a person who books. Tied to an Organization, not a global user.
- **Hold** — a temporary lock on a slot (15-minute expiry) while the customer completes checkout.
- **★ Payment** — a transaction for a Booking. Provider-agnostic record with idempotency key.
- **Deposit** — a partial upfront payment (e.g. 50%) to secure the slot. Remainder due at arrival.

### Page & Public Presence

- **★ Page** — the public, unique-link storefront for an Organization (`app.com/p/marco-pickleball`). Server-rendered with OG preview.
- **Theme** — a color + font pairing the owner can pick (3–4 v1 themes).
- **Slug** — the URL path segment identifying the Organization's Page. Editable once, then locked.

### Future Features

- **★ Campaign** — *(future)* a raffle/giveaway attached to a Page.
- **★ Task** — *(future)* an action an entrant must complete to earn entries.
- **★ Entrant** — *(future)* a person who enters a Campaign.
- **★ Entry** — *(future)* one ticket in a raffle draw.

These entities exist in the schema for forward-compatibility but are not built until post-v1 (see §8).

### Operations

- **★ Audit Log** — immutable record of all admin actions (who did what, when, target, before/after).
- **★ Org Member** — a user with a role (owner | staff) inside an Organization.
- **RLS (Row-Level Security)** — Postgres policy that transparently filters rows by org membership. Every tenant-scoped query respects it.

---

## 5.5. Design Principles & UX

These principles guide every UI decision. When a design choice is ambiguous, the answer is whichever option best satisfies these, in priority order.

### P1. The Owner is Mobile-First, Their Customer is Mobile-Only
- Owner dashboards are responsive but optimized for large phones (6.5\"). The public page is designed for a 4.7\" screen (small iPhone SE / budget Android) — that is the device most entrants use.
- Touch targets ≥ 44px. No hover-dependent interactions. No horizontal scroll. No "swipe to delete".

### P2. The Public Page Loads Like a Static Site
- First paint within 1.5s on 3G. Server-rendered HTML with streaming. No login wall. No "download our app" banner.
- Availability data loads after first paint (client-side fetch). The user sees skeleton dates immediately.

### P3. Account Creation is a Friction Tax, Not a Prerequisite
- A customer can book with just name, email, and phone. No password. No profile creation.
- Account is created implicitly on first booking (via magic link or post-booking prompt).
- Phone (OTP) verification is reserved for high-trust flows like claiming a booking or accessing account history.

### P5. Error States Are Designed, Not an Afterthought
- \"This slot is gone\" shows 3 nearest alternatives. \"Payment failed\" preserves the booking in held state. \"Network error\" retries silently once.
- Every empty state has a call to action. Every confirmation has a screenshot/an action button.

### P6. Configuration is Progressive
- The setup wizard asks for the minimum (business name, 1 service, hours, slug) in one sitting. Advanced features (multiple resources, buffers, payment settings) are available but not required to go live.
- Defaults are sensible: buffer = 15 min, max advance = 30 days, price = free.

### P7. Staff Don't See Money
- Staff interface shows only the schedule and check-in controls. Revenue, settings, customer contact details beyond name/phone are owner-only.
- Enforced at the database RLS level, not just hidden buttons.

---

## 6. User Stories

### Owner
1. As an owner, I want to define my courts and my hourly rates so that customers can book the right slot at the right price without messaging me.
2. As an owner, I want to set my operating hours, holidays, and blackout dates so that nobody books me on Christmas.
3. As an owner, I want a single link I can put in my Facebook bio so that my page is the one place people go.
4. As an owner, I want to require a deposit before a slot is held so that no-shows cost the customer, not me.
5. As an owner, I want to manually add a walk-in booking so the digital calendar stays the source of truth.
6. As an owner, I want to see today's bookings and this month's revenue at a glance so I know if the business is working.
7. As an owner, I want to brand my public page with my logo, cover image, and colors so it feels like my business, not a generic form.
8. As an owner, I want to reorder the sections on my page (bio, services, gallery, contact) so I control the story.
9. As an owner, I want my page to look great when shared on Facebook Messenger so customers trust the link.

### Staff
11. As a staff member, I want to see today's schedule on my phone so I can check people in at the door.
12. As a staff member, I want to mark a booking as completed or no-show so the owner's reports are accurate.
13. As a staff member, I want to *not* see revenue or settings, so the owner can trust me with the login.

### Customer
14. As a customer, I want to see real availability and prices without signing up so I don't bounce.
15. As a customer, I want to book and pay a deposit in under two minutes on my phone.
16. As a customer, I want a confirmation I can screenshot, and a reminder before my slot.
17. As a customer, I want to cancel or reschedule within the allowed window without messaging anyone.

### Edge cases worth specifying
20. As a customer, when the slot I selected gets taken while I'm filling in my details, I want to be told immediately and shown the nearest alternatives — not fail at payment.
21. As an owner, when I shorten my operating hours, I want to be warned about existing bookings that now fall outside them rather than silently orphaning them.

---

## 7. Requirements

### 7.1 Must-Have — P0

#### R1. Auth & Tenancy
Email/password plus Google OAuth via Supabase Auth. Every row in the system is scoped to an `organization_id` enforced by Postgres Row Level Security — not by application code. Three roles: `owner`, `staff`, `customer`.

**Acceptance criteria**
- [ ] A signed-in user of Org A receives zero rows when querying any Org B resource, verified by an automated RLS test suite.
- [ ] Owner can invite staff by email; invite expires in 7 days.
- [ ] Staff role cannot read `payments`, `reports`, or `organization_settings` — enforced at the RLS policy level, not just hidden in the UI.
- [ ] Customers never need an account to browse a Page; account creation is optional and post-booking.

#### R2. Business Setup (Resources & Services)
- [ ] Owner can create Locations, each with timezone and weekly operating hours.
- [ ] Owner can create Resources, assign each to a Location, and set capacity (1 for a court, N for a group class).
- [ ] Owner can create Services with: name, duration, price, buffer-before, buffer-after, eligible Resources, max advance booking window, min notice period.
- [ ] Owner can add blackout dates and one-off hour overrides (e.g. "closed 2–5pm Dec 24").

#### R3. Availability Engine
The core of the product. Given a Service, a date range, and configured hours, return bookable slots.

- [ ] Slots respect operating hours, buffers, blackouts, existing bookings, and minimum notice.
- [ ] All times stored in UTC; all display in the Location's timezone. DST-safe (matters if this ever leaves PH).
- [ ] **Double-booking is prevented at the database level** using a Postgres `EXCLUSION` constraint on a `tstzrange` per resource, not by an application-layer check. Concurrent conflicting inserts must fail one of them.
- [ ] Slot query for a 30-day window returns in < 500ms p95.

#### R4. Public Page (Unique Link)
- [ ] Every Organization gets a unique slug at `/p/{slug}`, editable once claimed, validated against a reserved-word list.
- [ ] Page shows: cover image, logo, business name, description, services with prices, availability calendar, location/map, contact, socials, and any active Campaign.
- [ ] Owner can pick from 3–4 themes (color + font pairing) and reorder page sections.
- [ ] Server-rendered with per-page metadata and OG image — a shared link must render a rich preview on Facebook and Messenger.
- [ ] Lighthouse mobile performance ≥ 90; the page is usable on a throttled 3G connection.
- [ ] Owner can unpublish, which returns a 404-style "not currently accepting bookings" page.

#### R5. Booking Flow
- [ ] Customer flow: pick Service → pick date/time → enter name, mobile, email → confirm. Four screens maximum on mobile.
- [ ] A selected slot is soft-held for 10 minutes while the customer completes the form; expired holds return to the pool.
- [ ] Conflict on submit returns an inline error with three nearest alternative slots — never a payment-stage failure.
- [ ] Confirmation email with an `.ics` attachment plus an on-screen confirmation code.
- [ ] Customer can cancel or reschedule via a signed magic link, within a policy window the owner sets.
- [ ] Owner/staff can manually create, edit, reassign, or cancel any booking from the dashboard.

#### R6. Payments (Deposits)
- [ ] Per-Service payment mode: none / deposit (fixed or %) / full prepayment.
- [ ] PH-appropriate provider integration (PayMongo or Xendit — see Open Questions) covering GCash, Maya, and cards.
- [ ] Webhook-driven status transitions; the booking is only `confirmed` after the provider confirms, never on client-side redirect alone.
- [ ] Idempotent webhook handling — a replayed event must not double-confirm or double-refund.
- [ ] Manual "mark as paid" for cash/bank transfer, with an audit trail of who marked it.

#### R7. Owner Dashboard
- [ ] Today view: chronological list of bookings across all Resources, with check-in and no-show actions.
- [ ] Calendar view: day / week / resource-column layouts.
- [ ] Customer list with booking history, no-show count, and total spend.
- [ ] Basic reports: bookings and revenue by day/week/month, by Service, by Resource utilization %.

#### R8. Notifications
- [ ] Transactional email (Resend) for: booking confirmation, cancellation, reschedule, reminder 24h and 2h before.
- [ ] SMS (Semaphore or Twilio) for OTP verification at minimum.
- [ ] Every template renders correctly on mobile Gmail and Outlook.

---

## 7. Edge Cases & Error States

Explicitly designed failure modes that the implementation must handle gracefully.

### Booking Race Condition
- Two customers click "Book" on the same slot simultaneously.
- **Required:** Postgres exclusion constraint rejects one; the loser sees an inline error with 3 nearest available alternatives. No partial state. No payment taken for a failed booking.

### Payment Webhook Out of Order
- Provider sends `succeeded` before the checkout session is created in our DB (rare but possible).
- **Required:** Idempotency key on the webhook handler. The handler upserts based on provider reference; booking state machine accepts `succeeded` from any prior state except `cancelled`.

### Slot Held Then Abandoned
- Customer starts booking (slot enters `held` state) but never completes.
- **Required:** A scheduled job releases `held` bookings older than 15 minutes. The released slot becomes available again. Owner sees "abandoned hold" in the booking log.

### Owner-Cancelled Booking With Deposit
- Owner cancels a customer's booking that had a deposit.
- **Required:** Payment is voided/refunded (if captured) or cancelled (if pending). Customer receives email.

### Timezone / DST Transition
- A location in a DST-observing timezone has a booking at 2:30 AM on the transition day.
- **Required:** All times stored in UTC. Availability engine snaps to local-time boundaries but stores UTC ranges. Test explicitly around "spring forward" and "fall back" windows.

### Empty State: No Services Configured
- Owner publishes the page but hasn't added any services.
- **Required:** Public page shows "No services available yet — check back soon" with a contact button. Owner dashboard shows an empty-state CTA to create the first service.

### Walk-in vs Online Race
- Customer walks in, owner creates a booking manually on their phone while another customer books the same slot online.
- **Required:** Exclusion constraint prevents double-booking. First write to Postgres wins; the loser sees the slot as taken.

### Phone OTP Delivery Failure
- Entrant's SMS carrier is slow or the phone is in a dead zone.
- **Required:** "Resend code" button with 30s cooldown. Fallback to voice call or WhatsApp if available. Session persists for 10 minutes.

---

## 8. Nice-to-Have & Future Scope

### 8.1 Nice-to-Have — P1

- **Recurring bookings** — "every Tuesday 7pm for 8 weeks", important for coaching blocks and court regulars.
- **Waitlist** — auto-notify the queue when a slot frees up.
- **Google Calendar two-way sync** for photography studios who live in their calendar.
- **Package/credits** — sell "10 court hours", decrement per booking. High revenue relevance for pickleball.
- **Discount codes** — automatic or owner-created promotional codes.
- **Group bookings** — capacity > 1, multiple customers per slot, for clinics and open play.
- **Custom domain** mapping via Vercel domains API.
- **Embeddable widget** — a script tag that drops the booking calendar into an existing WordPress/Wix site.
- **Multi-language** (English / Filipino) toggle on the public page.
- **Campaigns & raffles** — giveaways with task-based entry, OTP verification, provably fair draws, and winner management. See [database-schema.md](database-schema.md) for the schema designed for this.

### 8.2 Future Considerations — P2

These are not being built, but the architecture should not preclude them:

- **Marketplace / directory** — implies a canonical taxonomy of Services and geospatial indexing on Locations. Keep `service_category` and `lat/lng` columns even if unused.
- **Dynamic/surge pricing** — peak-hour rates. Keep price on the `booking` row (a snapshot) rather than joining live to `services`.
- **Staff commission & payouts** — keep `assigned_staff_id` on bookings from day one.
- **Public API and webhooks** for larger customers.
- **Native app** — keeping all business logic in Postgres functions and API routes rather than in React makes this cheaper later.

---

## 9. Technical Design

### 8.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript strict | Server Components for the public page (SEO + OG previews), Server Actions for mutations |
| UI | Tailwind CSS + shadcn/ui | Owned components, no version-lock on a component library |
| Database | Supabase Postgres | RLS gives real multi-tenancy; `tstzrange` + exclusion constraints solve the hardest problem natively |
| Auth | Supabase Auth | Same JWT feeds RLS policies |
| Storage | Supabase Storage | Page images, cover photos |
| Hosting | Vercel | Preview deploys per PR; edge caching for public pages |
| Jobs | Vercel Cron + Supabase `pg_cron` | Reminders, hold expiry |
| Email | Resend + React Email | Templates in the same TS codebase |
| SMS | Semaphore (PH) or Twilio | OTP verification |
| Payments | PayMongo or Xendit | GCash and Maya coverage is non-negotiable for PH |
| Validation | Zod on every boundary | Shared schemas between form and Server Action |
| Errors/analytics | Sentry + PostHog | Funnel instrumentation is required for §10 metrics |
| Testing | Vitest (unit), Playwright (e2e) | e2e must cover the concurrent-booking race |

### 8.2 Data Model (initial sketch)

```
organizations       id, name, slug, plan, created_at
org_members         org_id, user_id, role (owner|staff)
locations           id, org_id, name, address, lat, lng, timezone
operating_hours     id, location_id, weekday, opens_at, closes_at
hour_overrides      id, location_id, date, opens_at, closes_at, is_closed, note
resources           id, org_id, location_id, name, type, capacity, is_active
services            id, org_id, name, duration_min, price_cents, buffer_before_min,
                    buffer_after_min, payment_mode, deposit_cents, min_notice_min,
                    max_advance_days, service_category, is_active
service_resources   service_id, resource_id
customers           id, org_id, name, email, phone, notes, no_show_count
bookings            id, org_id, resource_id, service_id, customer_id,
                    assigned_staff_id, time_range TSTZRANGE, status, price_cents,
                    source (public|manual), created_at
                    -- EXCLUDE USING gist (resource_id WITH =, time_range WITH &&)
                    --   WHERE (status IN ('held','confirmed'))
payments            id, booking_id, provider, provider_ref, amount_cents, status
pages               org_id, theme, sections JSONB, cover_url, logo_url, bio, socials

-- Future: campaigns, campaign_tasks, entrants, task_completions, entries, winners
-- See database-schema.md for full schema including future tables
```

Every table carrying `org_id` gets an RLS policy of the shape `org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())`. Public page reads go through a `SECURITY DEFINER` function exposing only whitelisted columns, so anonymous visitors never touch base tables directly.

### 9.2 Key Technical Risks

| Risk | Mitigation |
|---|---|
| Race condition on concurrent booking of the same slot | Postgres exclusion constraint as the source of truth; e2e test that fires N parallel requests and asserts exactly one succeeds |
| Timezone and DST bugs | UTC storage, `date-fns-tz` at the boundary, snapshot tests around DST transitions |
| Payment webhook replay / out-of-order delivery | Idempotency keys, provider event IDs stored uniquely, state machine that rejects invalid transitions |
| RLS misconfiguration leaking cross-tenant data | Automated RLS test suite in CI running as multiple simulated tenants; no route uses the service-role key except a small, reviewed server-only module |
| Vercel serverless cold starts on the public page | Static shell + streaming; availability fetched client-side after first paint |

---

## 10. Success Metrics

**Leading (first 30 days post-launch)**

| Metric | Success | Stretch |
|---|---|---|
| Signup → published page | 50% | 65% |
| Median time to publish | < 15 min | < 8 min |
| Public page view → booking started | 25% | 35% |
| Booking started → confirmed | 60% | 75% |
| Booking creation p95 latency | < 1.5s | < 800ms |

**Lagging (60–180 days)**

| Metric | Success | Stretch |
|---|---|---|
| Month-3 org retention | 60% | 75% |
| Free → paid conversion | 8% | 15% |
| Bookings per active org per month | 40 | 100 |

Measurement via PostHog funnels; each metric needs its event defined before the corresponding feature merges, not after.

---

## 11. Open Questions

**Blocking**
- **[Product]** Which vertical do we build the first template for — pickleball or photography? They differ in duration variability and deposit behavior. Building for both simultaneously risks a generic product that fits neither. *Recommendation: pickleball first — fixed hourly slots, simpler availability.*
- **[Engineering/Finance]** PayMongo vs. Xendit: fee structure, onboarding time for a sole proprietorship, GCash reliability, payout schedule. Blocks R6.
- **[Product]** Pricing model: per-org flat monthly, per-booking fee, or freemium capped on bookings/month? Affects the schema (`plan`, usage counters) and the paywall placement.

**Non-blocking**
- **[Engineering]** Do we hold slots in Postgres with a `held` status plus expiry, or in Redis/Upstash? Postgres is simpler and one fewer service; revisit if hold contention becomes hot.
- **[Design]** How many themes ship in v1, and do we allow custom brand color or only presets?
- **[Data]** Retention policy for customer PII — proposed default is 12 months with owner-initiated deletion.

---

## 12. Phasing

**Phase 0 — Foundations (1–2 weeks)**
Repo, CI, Supabase project, schema migrations, auth, org/member model, RLS policies and their test suite, shadcn setup and design tokens. Nothing user-visible; everything downstream depends on it.

**Phase 1 — Booking Core (3–4 weeks)**
R1, R2, R3, R5, R7. Internal milestone: an owner can configure a business and manually create bookings without double-booking. No public page yet.

**Phase 2 — Public Page (2 weeks)**
R4 plus customer-facing R5 and R8 email. **Milestone: first real business goes live with real customers.** Ship here and get feedback before touching money.

**Phase 3 — Payments (2 weeks)**
R6. Deposits are the feature owners will pay for, but shipping them before the booking flow is proven risks debugging two hard systems at once.

**Phase 4 — Harden & Monetize (2 weeks)**
Plans and billing, rate limits, observability, onboarding polish, load testing.

Roughly 10–12 weeks solo at a steady pace. There are no external hard deadlines; the natural pressure is to get Phase 2 live with one friendly business as early as possible and let their feedback re-order everything after it.

Future phases (campaigns/raffles, team roles, Google Calendar sync, etc.) will be scoped after live customer feedback. The schema in [database-schema.md](database-schema.md) and the system design in [architecture.md](architecture.md) already account for these.

---

## 13. Parking Lot

Good ideas explicitly not in scope, recorded so they don't leak into v1: loyalty points, reviews and ratings on the public page, AI-generated page copy, tournament brackets for pickleball, client galleries and file delivery for photographers, an SMS-based booking bot, franchise/multi-org rollups.
