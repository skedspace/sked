# Task Tracker — SKED

**Last updated:** 2026-07-29
**Total target:** ~10–12 weeks

---

## Progress Overview

```
Phase 0: Foundations     [████████████████████] 100%  (15/15)
Phase 1: Booking Core    [████████████████████] 100%  (23/23)
Phase 2: Public Page     [████████████████████] 100%  (14/14)
Phase 3: Payments        [████████████████████] 100%  (12/12)
Phase 4: Harden & Ship   [████████████████████] 100%  (12/12)
Phase 5: Landing Page    [████████████████████] 100%  (16/16)
Phase 6: Page Design     [████████████████████] 100%  (10/10)
Phase 7: Launch & Beta   [▓▓▓▓░░░░░░░░░░░░░░░░]  20%   (3/15)
═══════════════════════════════════════════════════════
Overall:                 [████████████████████████████████▓▓░░]  87% (107/122)

Legend: ██ = completed, ▓▓ = in progress, ░░ = not started
```

### Quick Status

| Phase | Tasks | Complete | In Progress | ETA |
|---|---|---|---|---|
| **0. Foundations** | 15 | 15 | 0 | ✅ Done |
| **1. Booking Core** | 23 | 23 | 0 | ✅ Done |
| **2. Public Page** | 14 | 14 | 0 | ✅ Done |
| **3. Payments** | 12 | 12 | 0 | ✅ Done |
| **4. Harden & Ship** | 12 | 12 | 0 | ✅ Done |
| **5. Landing Page** | 16 | 16 | 0 | ✅ Done |
| **6. Page Design** | 10 | 10 | 0 | ✅ Done |
| **7. Launch & Beta** | 15 | 5 | 10 | 🟡 In progress |
| **Total** | **117** | **107** | **10** | **🔴 Launch prep active** |

---

## Phase 0 — Foundations (Week 1–2)

**Goal:** Repo, CI, Supabase project, schema migrations, auth, org model, RLS, design system. Nothing user-visible; everything downstream depends on it.

### 0.1 Project Scaffold

```
[x] [████████████████████] 100%
```

- [x] **T-0.1.1** Initialize Next.js 15 project scaffold (App Router, TypeScript strict, `src/` directory)
- [x] **T-0.1.2** Configure Tailwind CSS v4 with custom design tokens
- [x] **T-0.1.3** Integrate shadcn/ui — install and configure components (Button, Card, Dialog, Input, Select, Calendar, Table, Badge, Toast)
- [x] **T-0.1.4** Set up ESLint (flat config) + Prettier
- [x] **T-0.1.5** Set up absolute imports (`@/` path alias)
- [x] **T-0.1.6** Configure environment variables (`NEXT_PUBLIC_SUPABASE_URL`, etc.) with Zod validation via `env.ts`

### 0.2 Supabase & Database

```
[x] [████████████████████] 100%  (9/9)
```

- [x] **T-0.2.1** Create Supabase project + local CLI setup (`supabase init`, `supabase start`)
- [x] **T-0.2.2** Write initial migration: `organizations` + `org_members` tables
- [x] **T-0.2.3** Write migration: `locations`, `operating_hours`, `hour_overrides`
- [x] **T-0.2.4** Write migration: `resources`, `services`, `service_resources`
- [x] **T-0.2.5** Write migration: `customers`, `bookings` with EXCLUSION constraint on `tstzrange`
- [x] **T-0.2.6** Write migration: `payments` table
- [x] **T-0.2.7** Write migration: `pages` table
- [x] **T-0.2.8** Write migration: `audit_log` table
- [x] **T-0.2.9** Create seed data (`supabase/seed.sql`) — demo org, courts, services, page

### 0.3 Auth & RLS

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-0.3.1** Configure Supabase Auth (email/password + Google OAuth)
- [x] **T-0.3.2** Write RLS policies for all org-scoped tables (tenant isolation pattern)
- [x] **T-0.3.3** Write SECURITY DEFINER functions for public page access (`get_public_page`, `get_available_slots`)
- [x] **T-0.3.4** Build RLS test suite — automated CI tests verifying cross-tenant isolation

### 0.4 CI & Infrastructure

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-0.4.1** Set up GitHub Actions CI (type-check, lint, Vitest, Playwright smoke)
- [x] **T-0.4.2** Set up Vercel project + preview deploys per PR
- [x] **T-0.4.3** Configure Sentry error monitoring
- [x] **T-0.4.4** Configure PostHog analytics (events, funnels)

---

## Phase 1 — Booking Core (Week 3–6)

**Goal:** An owner can configure a business and create bookings without double-booking. Owner dashboard works. No public page yet.

### 1.1 Organization & Team Setup

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-1.1.1** Build org signup flow (auto-provision org + owner role on auth)
- [x] **T-1.1.2** Build org settings page (name, slug, contact info)
- [x] **T-1.1.3** Build staff invitation flow (email invite, accept, role assignment)
- [x] **T-1.1.4** Build staff management UI (list, remove, role change)

### 1.2 Location & Availability

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-1.2.1** Build location CRUD (create, edit, list, delete)
- [x] **T-1.2.2** Build operating hours UI (per-weekday open/close with time pickers)
- [x] **T-1.2.3** Build hour overrides UI (date picker + open/close/closed toggle)
- [x] **T-1.2.4** Build availability preview — show visual timeline of open vs booked slots

### 1.3 Resources & Services

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-1.3.1** Build resource CRUD (name, location, capacity, active toggle)
- [x] **T-1.3.2** Build service CRUD (name, duration, price, buffers, advance window, notice period)
- [x] **T-1.3.3** Build service-resource assignment UI (which resources can fulfill which services)
- [x] **T-1.3.4** Build service list with active/inactive filtering

### 1.4 Customer Management

```
[x] [████████████████████] 100%  (3/3)
```

- [x] **T-1.4.1** Build customer list view (search by name/phone/email)
- [x] **T-1.4.2** Build customer detail view (booking history, no-show count, total spend)
- [x] **T-1.4.3** Build customer add/edit form (manual entry for walk-ins)

### 1.5 Booking Engine (Server)

```
[x] [████████████████████] 100%  (7/7)
```

- [x] **T-1.5.1** Implement availability engine — given service + date range, return bookable slots
- [x] **T-1.5.2** Implement booking creation — validate constraints, insert with exclusion constraint, handle race condition error
- [x] **T-1.5.3** Implement booking hold system (10-min expiry; `pg_cron` cleanup)
- [x] **T-1.5.4** Implement idempotent booking creation (idempotency key UNIQUE constraint)
- [x] **T-1.5.5** Implement booking cancellation (owner and token-based customer cancel)
- [x] **T-1.5.6** Implement booking reschedule (owner-initiated)
- [x] **T-1.5.7** Write e2e test: N parallel booking requests, assert exactly one succeeds

### 1.6 Owner Dashboard — Core

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-1.6.1** Build today view — chronological list of bookings across all resources
- [x] **T-1.6.2** Build calendar view — day layout with resource columns
- [x] **T-1.6.3** Build calendar view — week layout
- [x] **T-1.6.4** Build booking detail panel (customer info, time, service, status)
- [x] **T-1.6.5** Build manual booking creation form (for walk-ins and phone bookings)
- [x] **T-1.6.6** Build check-in / no-show action buttons

---

## Phase 2 — Public Page (Week 7–8)

**Goal:** First real business goes live with real customers. The page is a beautiful storefront that leads into the booking scheduler.

### 2.1 Page Builder

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-2.1.1** Build page theme selection (3–4 color + font pairs)
- [x] **T-2.1.2** Build page section reordering UI (hero, about, services, gallery, contact)
- [x] **T-2.1.3** Build page branding form (logo upload, cover image, bio, social links)
- [x] **T-2.1.4** Build publish / unpublish toggle with confirmation

### 2.2 Public Storefront

```
[x] [████████████████████] 100%  (7/7)
```

- [x] **T-2.2.1** Build server-rendered page route at `/p/[slug]` (fast first paint, OG tags)
- [x] **T-2.2.2** Build page header (cover image, logo, business name, bio)
- [x] **T-2.2.3** Build service listing component (show services with duration and price)
- [x] **T-2.2.4** Build date picker with available dates highlighted
- [x] **T-2.2.5** Build time slot grid showing available start times
- [x] **T-2.2.6** Build contact / location section (map placeholder, address, social links)
- [x] **T-2.2.7** Ensure Lighthouse mobile performance ≥ 90

### 2.3 Customer Booking Flow

```
[x] [████████████████████] 100%  (7/7)
```

- [x] **T-2.3.1** Build booking form (name, email, phone, notes) — four screens max
- [x] **T-2.3.2** Build slot selection → hold → form → confirm flow
- [x] **T-2.3.3** Build "slot taken" error with 3 nearest alternatives
- [x] **T-2.3.4** Build confirmation screen (confirmation code, details, screenshot button)
- [x] **T-2.3.5** Build email integration (Resend) — booking confirmation, cancellation, 24h reminder
- [x] **T-2.3.6** Build magic-link cancellation flow (signed token in email, no login required)
- [x] **T-2.3.7** Build mobile responsiveness audit (375px viewport, touch targets ≥ 44px)

---

## Phase 3 — Payments (Week 9–10)

**Goal:** Owners can collect deposits and full payments through the booking flow.

### 3.1 Payment Provider Integration

```
[x] [████████████████████] 100%  (6/6)
```

- [x] **T-3.1.1** Evaluate and select provider (PayMongo vs Xendit)
- [x] **T-3.1.2** Set up provider account and webhook endpoints
- [x] **T-3.1.3** Implement provider SDK integration (checkout session creation)
- [x] **T-3.1.4** Build webhook handler with idempotency key processing
- [x] **T-3.1.5** Build payment status state machine (pending → succeeded / failed)
- [x] **T-3.1.6** Build manual "mark as paid" for cash/bank transfer (with audit trail)

### 3.2 Payment Configuration & Flow

```
[x] [████████████████████] 100%  (6/6)
```

- [x] **T-3.2.1** Add payment mode to services (free / deposit / full)
- [x] **T-3.2.2** Build deposit configuration (fixed amount or percentage)
- [x] **T-3.2.3** Integrate payment step into customer booking flow
- [x] **T-3.2.4** Build payment receipt screen and email
- [x] **T-3.2.5** Build refund flow (owner-initiated with reason)
- [x] **T-3.2.6** Build payment history view in owner dashboard

---

## Phase 4 — Harden & Ship (Week 11–12)

**Goal:** Product is stable, monitored, and ready for a friendly beta launch.

### 4.1 Onboarding Polish

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-4.1.1** Build onboarding wizard (multi-step: business info → services → hours → publish)
- [x] **T-4.1.2** Add loading skeletons and empty states to every page
- [x] **T-4.1.3** Add route-level error boundaries + user-friendly recovery states for public booking flow (`p/[slug]`, `embed/[slug]`), payment pages (`dashboard/payments`), and owner dashboard (bookings, calendar, courts, matches, players, settings, customers, reports, reviews). Add `not-found.tsx` at root, `p/[slug]`, and `dashboard` levels. All boundaries avoid exposing raw backend errors and preserve actionable retry/navigation options.
- [x] **T-4.1.4** Build inline tour / tooltips for first-time owners

### 4.2 Monitoring & Observability

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-4.2.1** Add Sentry source maps + user context for error tracking
- [x] **T-4.2.2** Add PostHog event instrumentation for all funnel steps
- [x] **T-4.2.3** Set up uptime monitoring (Better Uptime or similar)
- [x] **T-4.2.4** Set up performance budgets in CI (Lighthouse CI)

### 4.3 Plans & Rate Limits

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-4.3.1** Define pricing tiers (free vs paid — based on bookings/month)
- [x] **T-4.3.2** Implement usage counters (bookings per month, active resources)
- [x] **T-4.3.3** Implement plan enforcement (upgrade prompts, rate limit responses)
- [x] **T-4.3.4** Build subscription management UI

### 4.4 Load Testing & Launch

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-4.4.1** Run load test on booking creation endpoint (simulate N concurrent users)
- [x] **T-4.4.2** Run load test on public page (high traffic scenario)
- [x] **T-4.4.3** Verify all e2e tests pass in CI
- [x] **T-4.4.4** Friendly beta launch with 2–3 businesses; collect feedback

---

## Phase 5 — Landing Page Redesign

**Goal:** Refresh the marketing landing page with a consistent brand identity, better visual hierarchy, and pickleball-appropriate content.

### 5.1 Hero Section

```
[x] [████████████████████] 100%
```

- [x] **T-5.1.1** Replace background image with new `newbg.png` asset
- [x] **T-5.1.2** Adjust background image positioning (`object-bottom`, `object-cover`)
- [x] **T-5.1.3** Unify green color across hero: `#c8fb2f` → `#b9f34b` (logo, buttons, badges, icons, highlights)
- [x] **T-5.1.4** Unify hover states: `#d7ff55` → `#c8ff62`
- [x] **T-5.1.5** Resize and reposition the 3 stat cards (Courts booked, Upcoming match, New booking) — hidden for now
- [x] **T-5.1.6** Remove "More play. Less hassle." tagline

### 5.2 Trusted Brands Marquee

```
[x] [████████████████████] 100%
```

- [x] **T-5.2.1** Reduce marquee height (`py-9` → `py-6`)
- [x] **T-5.2.2** Add green dot separators between brand names
- [ ] ~T-5.2.3~ (removed "Made for the way you work" component)

### 5.3 Features Section — "Everything in Sync"

```
[x] [████████████████████] 100%
```

- [x] **T-5.3.1** Redesign from card grid → showcase + feature pills layout
- [x] **T-5.3.2** Update ProductPreview to show pickleball court schedule (Ace Pickleball, Singles/Doubles/Clinic)
- [x] **T-5.3.3** Remove unused `FeatureVisual` component (~66 lines)
- [x] **T-5.3.4** Each feature pill has icon, title, description, number — hover lift

### 5.4 How It Works Section

```
[x] [████████████████████] 100%
```

- [x] **T-5.4.1** Redesign from bordered step list → visual timeline with numbered circles
- [x] **T-5.4.2** Add vertical connecting line between steps
- [x] **T-5.4.3** Match label style to features section (uppercase tag with icon)

### 5.5 Remaining Sections

```
[x] [████████████████████] 100%  (5/5)
```

- [x] **T-5.5.1** Redesign Testimonials section to match new UI
- [x] **T-5.5.2** Redesign FAQ accordion to match new UI
- [x] **T-5.5.3** Redesign Blog preview section to match new UI
- [x] **T-5.5.4** Redesign CTA section to match new UI
- [x] **T-5.5.5** Footer cleanup / consistency pass

---

## Phase 6 — Page Design & Theming

**Goal:** Enhance the Public Page settings with a dedicated design workspace, customizable themes, dynamic primary color control, and full live preview integration.

### 6.1 Page Design Tab

```
[x] [████████████████████] 100%  (3/3)
```

- [x] **T-6.1.1** Add tab navigation (Content / Page Design) to `page-editor.tsx` — keep existing storefront/booking editing under Content tab
- [x] **T-6.1.2** Create Page Design tab layout containing: Page Status, Design Settings, Page Link, Social Links
- [x] **T-6.1.3** Both tabs share the header, save logic, and live preview — state is consistent across tab switches

### 6.2 Theme & Primary Color System

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-6.2.1** Add `primary_color` field to pages table type and save payload — persists user's chosen color
- [x] **T-6.2.2** Add color picker (`<input type="color">`) in Design Settings — users can pick any hex color
- [x] **T-6.2.3** Theme selector auto-sets primary color — each theme's first palette color becomes the default when selected
- [x] **T-6.2.4** Pass `primaryColor` prop through to PagePreview — live preview reflects chosen color in real time

### 6.3 Preview Integration — Dynamic Colors

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-6.3.1** Replace hardcoded `#b9f34b` accent in header, hero, CTA, icons with dynamic `primaryColor` via inline styles
- [x] **T-6.3.2** Replace hardcoded `#8bd11c` secondary accent in amenities icons, courts title, testimonials label & stars, contact headers, footer with dynamic `primaryColor`
- [x] **T-6.3.3** Footer social link pills use primary color for border and text/icon
- [x] **T-6.3.4** All accent elements across the storefront preview now respond to theme selection and custom color picker

### 6.4 Remaining — Theming Polish

```
[x] [████████████████████] 100%  (3/3)
```

- [x] **T-6.4.1** Finalize remaining theme definitions — make each theme's full palette (ink, paper, muted) flow through to the preview instead of hardcoded structural colors
- [x] **T-6.4.2** Apply primary color to booking flow preview — pass `primaryColor` to `PublicPageContent` and `BookingForm` for booking step accent elements
- [x] **T-6.4.3** Theme-aware contrast — ensure text on primary color backgrounds meets WCAG AA (adjust text color between ink/white depending on color luminosity)

---

## Completed Post-MVP Features

These have been implemented ahead of schedule.

| Feature | Status | Key Deliverables |
|---|---|---|
| **Embed Widget** | ✅ Done | Vanilla JS embed script, iframe widget, customizable button/text/color, copy-paste snippet |
| **Google Calendar Sync** | ✅ Done | OAuth flow, token management, two-way sync, settings UI with connect/disconnect |
| **Campaigns & Raffles** | ✅ Done | Campaign engine with OTP entry verification, provably fair draws, booking/social/share/referral tasks, CRUD |
| **Waitlist** | ✅ Done | Join waitlist in booking form, auto-notify on cancellation, settings view |
| **Team Roles** | ✅ Done | Staff invitation flow, team management UI, permission enforcement |
| **Custom Subdomains** | ✅ Done | Subdomain in org settings, `<name>.sked.space` support |
| **Discount Codes** | ✅ Done | RPC validation, settings CRUD, booking form integration |
| **Packages/Credits** | ✅ Done | Prepaid session bundles with RPC redemption, settings CRUD |
| **Recurring Bookings** | ✅ Done | Recurring rules engine, auto-generated future bookings |
| **Admin Dashboard** | ✅ Done | Platform overview at `/admin`, org/user/booking tables |
| **Dev Auth Bypass** | ✅ Done | `DEV_AUTH=true` bypasses sign-in for workspace browsing |

---

## Phase 7 — Launch & Beta (Current)

**Goal:** Prepare for and execute a friendly beta launch. Fix build issues, set up monitoring, run quality checks, and onboard initial businesses.

### 7.1 Build & Dev Environment Fixes

```
[x] [████████████████████] 100%  (3/3)
```

- [x] **T-7.1.1** Fix blog `[slug]` async params — already using `params: Promise` + `await` (was stale cache error)
- [x] **T-7.1.2** Clear stale `.next` cache — production build now succeeds with zero errors; stale caches backed up
- [x] **T-7.1.3** Initialize Git repo and make initial commit for version tracking — done (3 commits on `main`)

### 7.2 CI & Quality Gates

```
[~] [▓░░░░░░░░░░░░░░░░░░░]   5%  (0/4)
```

- [~] **T-7.2.1** Run full type check (`pnpm typecheck`) and fix any regressions ← **NEXT**
- [ ] **T-7.2.2** Run linter (`pnpm lint`) and fix issues
- [ ] **T-7.2.3** Run existing unit tests (`pnpm test`) and RLS tests (`pnpm test:rls`)
- [ ] **T-7.2.4** Run e2e tests (`pnpm test:e2e`) — fix failing Playwright specs

### 7.3 Monitoring & Observability

```
[ ] [░░░░░░░░░░░░░░░░░░░░]   0%  (0/4)
```

- [ ] **T-7.3.1** Verify Sentry is installed and `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are set in `.env.local`
- [ ] **T-7.3.2** Verify PostHog is installed and `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` are configured
- [ ] **T-7.3.3** Create PostHog dashboards for funnel tracking (see `docs/monitoring.md`)
- [ ] **T-7.3.4** Set up uptime monitoring on `/api/health` (Better Uptime or similar)

### 7.4 Load Testing

```
[ ] [░░░░░░░░░░░░░░░░░░░░]   0%  (0/2)
```

- [ ] **T-7.4.1** Recreate production load tests after the Vercel/Supabase migration target is final

### 7.5 Deployment & Launch

```
[ ] [░░░░░░░░░░░░░░░░░░░░]   0%  (0/2)
```

- [ ] **T-7.5.1** Deploy to Vercel production and run final verification (health check, public page, booking flow, email)
- [ ] **T-7.5.2** Onboard 2–3 beta businesses, collect feedback, fix friction points

---

## Task Status Quick Reference

| Symbol | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Completed |
| `[-]` | Blocked / deferred |

---

## How To Use This Tracker

1. **Start each task** → change `[ ]` to `[~]`
2. **Complete each task** → change `[~]` to `[x]`
3. **Update progress bars** → count `[x]` tasks / total per phase, update percentage
4. **Blocked tasks** → use `[-]` instead of `[ ]` and add a note

When a phase hits 100%, move the bar to `[████████████████████] 100%` and update the overall count at the top.
