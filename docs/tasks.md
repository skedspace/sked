# Task Tracker — SKED

**Last updated:** 2026-08-05
**Total target:** ~10–12 weeks

---

## Progress Overview

```
Phase 0: Foundations     [████████████████████] 100%  (23/23)
Phase 1: Booking Core    [████████████████████] 100%  (28/28)
Phase 2: Public Page     [████████████████████] 100%  (18/18)
Phase 3: Payments        [████████████████████] 100%  (12/12)
Phase 4: Harden & Ship   [████████████████████] 100%  (16/16)
Phase 5: Landing Page    [███████████████████░]  95%  (20/21, 1 removed)
Phase 6: Page Design     [████████████████████] 100%  (14/14)
Phase 7: Launch & Beta   [▓▓▓▓▓▓▓▓░░░░░░░░░░░░]  42%  (10/24)
Phase 8: Polish & Infra  [████████████████████] 100%  (36/36)
Phase 9: Page & Reviews  [░░░░░░░░░░░░░░░░░░░░]   0%   (0/12)
═══════════════════════════════════════════════════════
Overall:                 [█████████████████░░░]  87% (177/204)

Legend: ██ = completed, ▓▓ = in progress, ░░ = not started
```

> **Note:** counts were re-derived from the actual checkboxes on 2026-08-05 — the
> earlier header numbers had drifted from the task lists below.

### Quick Status

| Phase | Tasks | Complete | In Progress | ETA |
|---|---|---|---|---|
| **0. Foundations** | 23 | 23 | 0 | ✅ Done |
| **1. Booking Core** | 28 | 28 | 0 | ✅ Done |
| **2. Public Page** | 18 | 18 | 0 | ✅ Done |
| **3. Payments** | 12 | 12 | 0 | ✅ Done |
| **4. Harden & Ship** | 16 | 16 | 0 | ✅ Done |
| **5. Landing Page** | 21 | 20 | 0 | ✅ Done (1 removed) |
| **6. Page Design** | 14 | 14 | 0 | ✅ Done |
| **7. Launch & Beta** | 24 | 10 | 0 | 🟡 In progress |
| **8. Polish & Infra** | 36 | 36 | 0 | ✅ Done |
| **9. Page & Reviews** | 12 | 0 | 0 | ⬜ Next up |
| **Total** | **204** | **177** | **0** | **🟡 Launch prep active** |

Phase 8 ran **in parallel** with Phase 7 — it captures the dashboard, media, and
infrastructure work done between 2026-07-29 and 2026-08-02 while the launch gates
in 7.2 were still open.

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
  > ⚠️ **Reopened 2026-08-05.** The committed suite is 7 placeholder assertions, not
  > real tests. Actual delivery tracked as **T-7.2.9**.

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
[~] [██████████░░░░░░░░░░]  50%  (2/4)
```

- [x] **T-7.2.1** Run full type check (`pnpm typecheck`) and fix any regressions — **passes clean**, 0 errors on a forced non-incremental run (`tsc --noEmit --incremental false`). No fixes needed.
- [x] **T-7.2.2** Run linter (`pnpm lint`) and fix issues — **0 errors**, exit 0. Warnings reduced 173 → 153 by removing dead imports/vars (`refund-manager`, `waitlist-view`, `tournament-info`, `tournament-bracket`, `team-management`, `session-control`, `mock-data`, `supabase/client`) and adding `^_` ignore patterns for `@typescript-eslint/no-unused-vars` in `.eslintrc.json` so the codebase's existing underscore-placeholder convention stops firing.
- [x] **T-7.2.3** Run existing unit tests (`pnpm test`) and RLS tests (`pnpm test:rls`) — both **green**, but green is misleading: unit = 1 file / 3 tests (`src/lib/storage.test.ts`), RLS = 7 tests that are **all `expect(true).toBe(true)` placeholders**. See T-7.2.9 and T-7.2.10.
- [ ] **T-7.2.4** Run e2e tests (`pnpm test:e2e`) — fix failing Playwright specs ← **NEXT**

### 🔴 Coverage gap found during T-7.2.3

```
[!] [░░░░░░░░░░░░░░░░░░░░]   0%  (0/2)  — launch blocker
```

- [x] **T-7.2.9** **Implement the RLS test suite for real.** The old `rls.test.ts` passed 7 tests in 3ms because every body was `expect(true).toBe(true)` with a `// Placeholder` comment — nothing queried the database. **T-0.3.4 was therefore never actually delivered.**
  - [x] **Suite written** — `src/lib/supabase/rls.test.ts` replaced with 21 real tests across 4 groups: tenant isolation (read + write + delete across two seeded orgs), role enforcement (owner vs staff on org settings and payments), public `SECURITY DEFINER` access (`get_public_page` column whitelist, unknown slug, service scoping), and anonymous direct-table access (organizations, bookings, payments, customer PII, org membership). Fixtures seed two complete orgs — owner + staff auth users, location, resource, service, customer, booking, payment, page — namespaced per run and torn down in `afterAll`. Every assertion runs as a genuinely signed-in user via anon key + user JWT, never service role.
  - [x] **Env plumbing** — `vitest.rls.config.ts` loads `.env` / `.env.local` / `.env.test.local` without adding a dotenv dependency, and prefers `SUPABASE_RLS_TEST_URL` / `_ANON_KEY` / `_SERVICE_KEY` so a `DEV_AUTH=true` developer's placeholder keys are never used by mistake.
  - [x] **Executed against the real stack on 2026-08-05** — **18 passed, 3 failed.** The 3 failures are genuine vulnerabilities, not test defects; root causes confirmed in `pg_policies`. Teardown verified clean (0 leftover orgs, 0 leftover users). Tracked as T-7.2.12 and T-7.2.13.
- [ ] **T-7.2.10** Raise unit coverage beyond `storage.test.ts` — the availability engine, booking creation/exclusion-constraint handling, and discount/package RPC validation have **no unit tests** despite being the highest-risk logic in the product.
- [ ] **T-7.2.11** **Bring up the scheduler's own local Supabase stack.** The instance answering on `localhost:54321` belongs to a *different project* — a POS/inventory app (containers named `supabase_*_pos`; tables `products`, `orders`, `stock_movements`, `payroll_records`; migrations `place_order`, `inventory_wiring`, `employee_id_login`). Its `organizations` table has no `slug` column. **The scheduler's local database is not running at all**, so `pnpm test:rls` has nothing valid to talk to. Blockers to clear:
  1. The POS stack occupies ports 54321–54323, which is exactly what `supabase/config.toml` requests — stop it, or move the scheduler to different ports.
  2. The Supabase CLI is not installed and not on PATH (nor is `pnpm`); `supabase start` / `supabase db push` cannot run.
  3. `.env.local` holds DEV_AUTH placeholders (`local-anon-key`, `local-service-role-key`), not real JWTs. Once the correct stack is up, capture real keys into `.env.test.local` (gitignored) as `SUPABASE_RLS_TEST_ANON_KEY` / `SUPABASE_RLS_TEST_SERVICE_KEY`.

  > ⚠️ Do **not** point the RLS suite at whatever happens to be on `:54321`. It seeds and deletes organizations, auth users, bookings and payments — against the POS database that would mean writing test fixtures into an unrelated project's data.

  **Resolved 2026-08-05.** The scheduler's own stack already existed as stopped `supabase_*_sked` containers. The POS stack was stopped with `docker stop` (containers and volumes intact — restart with `supabase start` from `H:\pos`), the `_sked` containers were restarted, and migration `00043_scope_public_assets_to_orgs` — the only one pending — was applied transactionally. The scheduler DB is now at 43/43 and serving `marco-pickleball` on `:54321`.

---

### 🔴 Vulnerabilities confirmed by the RLS suite (2026-08-05)

```
[!] [░░░░░░░░░░░░░░░░░░░░]   0%  (0/2)  — launch blockers
```

**Both fixed in `00044_scope_public_booking_access.sql` (2026-08-05). RLS suite now 27/27 green.**

- [x] **T-7.2.12** **Customer PII is world-readable across every tenant.** `00027_add_public_insert_policies.sql` creates:
  ```sql
  CREATE POLICY public_select_customers ON customers
      FOR SELECT TO anon, authenticated USING (true);
  ```
  Postgres OR-combines permissive policies, so this `true` completely overrides `tenant_isolation_customers`. Confirmed by two failing tests: an **authenticated owner of org A reads org B's customers**, and an **anonymous visitor with only the public anon key reads every customer row in the database** — name, email, phone, notes.

  **Fix:** replaced with `find_or_create_customer(p_org_id, p_name, p_email, p_phone)` — a `SECURITY DEFINER` function that matches on email then phone within one org, inserts when nothing matches, and returns **only a UUID**, so no customer row crosses the API boundary. `public_select_customers` and `public_insert_customers` are dropped. `src/lib/booking-actions.ts` now calls the RPC instead of querying the table. The anon `WITH CHECK (true)` policies on `bookings` and `audit_log` were tightened at the same time: bookings now require `source = 'public'` plus `public_booking_target_is_valid()` (org publicly bookable, resource and service both active and belonging to that org), and audit rows require a bookable org.

- [x] **T-7.2.13** **Staff can read payments.** `payments` carried three permissive policies: `tenant_isolation_payments` (`FOR ALL`, any org member), `tenant_isolation_payments_by_org` (`FOR ALL`, any org member), and `owners_only_read_payments` (`FOR SELECT`, owners only). Because permissive policies are OR'd, the owner-only restriction never bit and the intent recorded in `00005_create_payments.sql` (`-- Staff role cannot read payments`) never held.

  **Fix:** the two `FOR ALL` policies are replaced by command-specific `payments_member_insert` / `_update` / `_delete`, leaving `payments_owner_select` as the table's only `SELECT` policy. Because `payments.org_id` is nullable (00023 allows standalone expense rows), all four resolve the owning org through a `payment_org_id(org_id, booking_id)` helper that falls back to the parent booking.

> **T-0.3.4 is hereby reopened.** The Phase 0 checkbox stays `[x]` for history, but
> the RLS suite it refers to is a stub; T-7.2.9 is the real delivery.

**Remaining lint warnings (non-blocking, deferred):**

- [ ] **T-7.2.5** Replace `<img>` with `next/image` on the public page and landing components (~13 `@next/next/no-img-element` warnings) — touches LCP, so pair with the Lighthouse budget in T-4.2.4
- [ ] **T-7.2.6** Type the remaining `any` escapes (~120 warnings, concentrated in `supabase/server.ts`, `supabase/client.ts`, `posthog-provider`, `session-control`)
- [ ] **T-7.2.7** Decide the fate of the dead `SkedLockup` / `WaveDecor` components in `board-sponsor-bar.tsx` — remove or re-wire (left in place deliberately; they're finished design assets)
- [ ] **T-7.2.8** `src/lib/supabase/rls.test.ts` has unused scaffolding (`beforeAll`, `ANON_KEY`, `authedClient`) — resolve as part of T-7.2.3 rather than deleting it blind

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

### 🔴 T-7.2.14 — Public booking is broken against a real Supabase

```
[ ] [░░░░░░░░░░░░░░░░░░░░]   0%  (0/1)  — launch blocker
```

- [x] **T-7.2.14** **`createBooking` cannot complete for an anonymous customer.** Found while validating the 00044 fix; **pre-existing, not caused by it.** **Fixed in `00045_create_public_booking_rpc.sql` — RLS suite now 34/34 green.**

  `src/lib/supabase/server.ts:267` `createClient()` builds an **anon-key** client, so a public booking runs as role `anon`. `src/lib/booking-actions.ts` then does:
  ```ts
  await supabase.from("bookings").insert({...}).select("id").single();
  ```
  PostgREST turns `.select()` into `Prefer: return=representation`, which needs a **SELECT** policy on `bookings`. `anon` has never had one — `tenant_isolation_bookings` requires `auth.uid()` membership, which is NULL for anon. Verified directly against PostgREST: the bare insert returns **201**, the same insert with `return=representation` returns **401 / 42501 "new row violates row-level security policy"**. The row is written and then the action reports failure.

  This is masked in local development because `DEV_AUTH=true` makes `createClient()` return a mock that never touches Supabase — which is why it survived to this point. It means the MVP's core flow (T-2.3.2, T-2.3.4) has never worked end-to-end against a real database, and casts doubt on T-4.4.4's "friendly beta launch with 2–3 businesses".

  **Fix:** `create_public_booking(...)`, a `SECURITY DEFINER` RPC that re-validates the target, enforces the idempotency key, inserts, and returns the new id. `anon` now has **no privileges on `bookings` at all** — the `public_insert_bookings` policy added in 00044 is dropped, so the RPC is the only public write path. Granting `anon` a SELECT policy was explicitly rejected as a fix; it would have reopened the leak class T-7.2.12 just closed.

  Two behaviours are preserved through the RPC: the exclusion-constraint path raises a stable `SLOT_TAKEN` token so the server action can still offer three alternative slots, and a replayed idempotency key returns the original booking instead of erroring (covers browser back-navigation, per the MVP edge-case table).

  **Second bug fixed in the same pass:** the flow also inserted directly into `players` as `anon`. `players` has only `tenant_isolation_players`, so every public booking failed that insert silently — no error was checked — leaving the board, matches, tournaments and reports views without player records for any publicly-booked customer. Player find-or-link now happens inside the RPC, in a nested exception block so a player problem can never cost the customer their booking.

  Verified end to end against the real stack by replaying the server action's exact sequence as `anon`: `find_or_create_customer` → `can_create_booking` → `create_public_booking` → `increment_usage` all return 200/204, the booking row lands as `status=confirmed, source=public`, and the player row is created. Covered by 8 RLS tests including idempotent replay, slot conflict, cross-org resource, cross-org customer, unpublished org, and invalid time range.

---

## Phase 8 — Dashboard, Media & Infrastructure Polish (2026-07-29 → 2026-08-02)

**Goal:** Close the gaps found while preparing for beta — court/service management
was read-heavy and hard to correct, media had no upload path, local dev was broken
for new contributors, and CSP/serverless limits were blocking clean deploys.

### 8.1 Courts & Services Management

```
[x] [████████████████████] 100%  (10/10)
```

- [x] **T-8.1.1** Add direct image uploads for courts and the public page (`ac7b13e`)
- [x] **T-8.1.2** Compress uploads to WebP client-side before storing (`df89bce`)
- [x] **T-8.1.3** Clean up replaced and deleted court photos from storage (`7d54247`)
- [x] **T-8.1.4** Add bulk court creation and a duplicate-court action to the Courts tab (`8092d38`)
- [x] **T-8.1.5** Allow deleting courts from the Courts tab (`947b8e5`)
- [x] **T-8.1.6** Add deactivation fallback when a court has bookings and can't be deleted — FK `23503` is caught and the dialog offers "Set to Inactive"; delete/update scoped by `org_id` (`f1dea99`, PR #4)
- [x] **T-8.1.7** Add inline service quick-add inside the court dialog (`bec5cc5`)
- [x] **T-8.1.8** Surface the Services page and allow deleting services from the court dialog (`4842a67`)
- [x] **T-8.1.9** Fix duplicate court row appearing after adding the first court (`f7ddb99`)
- [x] **T-8.1.10** Point the Public Page preview at the subdomain URL (`d20d64d`)

### 8.2 Landing & Marketing

```
[x] [████████████████████] 100%  (6/6)
```

- [x] **T-8.2.1** Add trial and billing FAQs to the landing page (`6aabb43`)
- [x] **T-8.2.2** Remove the standalone `/pricing` page and rewire all references (`91d8861`)
- [x] **T-8.2.3** Wire landing pricing to admin settings so plans are editable without a deploy (`8743317`)
- [x] **T-8.2.4** Fix the landing "Sign in" link to route to `/login` (`71b55e1`)
- [x] **T-8.2.5** Add the animated landing booking rally (`7c01327`)
- [x] **T-8.2.6** Polish landing page motion design (`71602f5`)

### 8.3 Auth & Local Dev Environment

```
[x] [████████████████████] 100%  (7/7)
```

- [x] **T-8.3.1** Fix sign-in and sign-up not reaching the dashboard (`b68fdcd`)
- [x] **T-8.3.2** Add a working account menu to the dashboard sidebar (`bf0f513`)
- [x] **T-8.3.3** Grant API role privileges and fix `org_members` RLS infinite recursion (`aa11303`)
- [x] **T-8.3.4** Fix dev-auth mock Supabase clients (`0250818`)
- [x] **T-8.3.5** Add local Supabase dev bootstrap scripts (`52f28f1`)
- [x] **T-8.3.6** Relax CSP in development so the app hydrates locally (`b6ffd9a`)
- [x] **T-8.3.7** Fix Supabase CLI configuration schema and update the Supabase CI action/CLI (`7f06635`, `dda54fa`)

### 8.4 Security, Performance & Deployment

```
[x] [████████████████████] 100%  (9/9)
```

- [x] **T-8.4.1** Fix CSP nonce propagation in middleware (`b3fbf2e`)
- [x] **T-8.4.2** Align dynamic rendering with CSP nonces (`9e05664`)
- [x] **T-8.4.3** Harden CSP and optimize landing images (`11f1a53`)
- [x] **T-8.4.4** Improve production security headers and page performance (`4e9bf85`)
- [x] **T-8.4.5** Polish accessibility and frontend performance (`369fedc`)
- [x] **T-8.4.6** Reduce Vercel serverless function count to fit plan limits (`ec6a07d`)
- [x] **T-8.4.7** Consolidate auth and subscription routes into dynamic dispatchers (`d06cb51`)
- [x] **T-8.4.8** Pin deployments to Node 22 (`1330f76`)
- [x] **T-8.4.9** Fix all `react-hooks/exhaustive-deps` warnings (`35e6f34`)

### 8.5 Onboarding, Admin & Board

```
[x] [████████████████████] 100%  (4/4)
```

- [x] **T-8.5.1** Redesign the onboarding flow (`ba8348b`)
- [x] **T-8.5.2** Fix admin persistence and update legal consent (`1a80958`)
- [x] **T-8.5.3** Fix board sponsors migration ordering (`1d906b5`)
- [x] **T-8.5.4** Update board shine border effect (`8358d70`)

---

## Phase 9 — Public Page & Customer Reviews (Next)

**Goal:** Make the storefront do more for the owner, and let customers who
actually booked leave a review that shows up on the page.

### What already exists

| Piece | State |
|---|---|
| `reviews` table (`00026`) | ✅ Built — `org_id`, `customer_id`, `resource_id`, `booking_id`, `title`, `body`, `rating` 1–5, `source`, `status` (`published`/`pending`/`unpublished`/`flagged`), `response` |
| Dashboard moderation UI | ✅ Built — `src/app/dashboard/reviews/reviews-view.tsx` |
| Reviews on the public page | ❌ **Nothing.** No display, no submission — the storefront never references reviews |
| Review RLS | ⚠️ Org-members only. Both public read *and* public write need new access paths |

### 9.1 Public review submission

```
[ ] [░░░░░░░░░░░░░░░░░░░░]   0%  (0/5)
```

- [ ] **T-9.1.1** Decide the trust model. A review must be tied to a real, completed booking or the form becomes a spam target. Reuse the signed-token pattern already built for magic-link cancellation (T-2.3.6): email a review link after the booking's end time passes.
- [ ] **T-9.1.2** Add `submit_public_review(...)` as a `SECURITY DEFINER` RPC that validates the token, confirms the booking is `completed`, enforces one review per booking, and inserts with `status = 'pending'`. **Do not add an anon `INSERT ... WITH CHECK (true)` policy** — that is exactly the pattern that produced T-7.2.12 and T-7.2.14.
- [ ] **T-9.1.3** Build the review form route (rating stars, title, body) reached from the emailed link — no login.
- [ ] **T-9.1.4** Add the "leave a review" email to the Resend templates, triggered after booking completion.
- [ ] **T-9.1.5** Extend the RLS suite: valid token succeeds once, replay is rejected, forged/foreign token is rejected, review lands `pending` not `published`.

### 9.2 Public review display

```
[ ] [░░░░░░░░░░░░░░░░░░░░]   0%  (0/4)
```

- [ ] **T-9.2.1** Add `get_public_reviews(page_slug)` as a `SECURITY DEFINER` RPC returning only `status = 'published'` rows, and only display-safe fields — reviewer **first name or initial, never email or phone**. `reviews.customer_id` joins to the customers table whose PII exposure was just closed; do not undo that here.
- [ ] **T-9.2.2** Build the reviews section component (average rating, count, recent reviews, owner `response` shown inline).
- [ ] **T-9.2.3** Wire it into the page section ordering system so owners can position or hide it, consistent with Phase 6 theming (`primaryColor` for stars and accents).
- [ ] **T-9.2.4** Aggregate rating in `get_public_page` for the hero/header, so the storefront can show "4.8 ★ (23)" without a second round trip.

### 9.3 Public page improvements

```
[ ] [░░░░░░░░░░░░░░░░░░░░]   0%  (0/3)
```

- [ ] **T-9.3.1** Scope the specific storefront improvements wanted — gather them before building, rather than guessing.
- [ ] **T-9.3.2** Fold in T-7.2.5 while touching this surface: the public page has ~6 `<img>` tags that should become `next/image` (LCP, and it is the page with a Lighthouse ≥ 90 target from T-2.2.7).
- [ ] **T-9.3.3** Re-run the Lighthouse mobile budget after the reviews section lands, so the new section does not regress T-2.2.7.

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
