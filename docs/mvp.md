# MVP — Booking & Business Page Platform

**Working name:** SKED (placeholder)
**Author:** Klein
**Status:** Draft v1
**Last updated:** 2026-07-25
**Based on:** [prd-scheduler-raffle.md](prd-scheduler-raffle.md) §12 (Phasing)

---

## 1. MVP Philosophy

Ship the smallest product that lets a real business replace their current manual booking process. Every feature beyond that point is validated by feedback from live owners before it's built.

**The MVP bet:** A business owner can sign up, configure their services and hours, publish a public booking page, and have customers book available slots — all without help, all in under 10 minutes. No payments, no raffles, no team roles yet.

---

## 2. What's In (MVP Scope)

### 2.1 Onboarding & Configuration

| Area | MVP Delivery |
|---|---|
| Org signup | Email + password or Google OAuth; auto-provisions a slug |
| Location setup | One location per org in MVP; name, address, timezone |
| Resource creation | Add/rename resources (courts, rooms, stations); capacity field present but unused until group booking |
| Service definition | Name, duration (min), price (PHP), buffer before/after, max advance days, min notice |
| Operating hours | Per-weekday open/close; simple half-day or full-day |
| Hour overrides | Close or shorten hours on specific dates (holidays, maintenance) |
| Page branding | Logo upload, cover image, short bio, social links (Facebook, Instagram) |

### 2.2 Public Booking Page

| Area | MVP Delivery |
|---|---|
| Unique URL | `app.com/p/{slug}` — mobile-first, fast-loading |
| Service listing | Customers see services with duration and price; no account required |
| Date picker | Shows available dates based on operating hours and existing bookings |
| Time slot grid | Renders available start times respecting duration, buffer, and advance notice |
| Booking form | Customer name, email, phone (required); notes (optional) |
| Confirmation | Instant confirmation screen + email sent; no payment step |
| Cancellation link | Included in confirmation email; customer can cancel without login (token-based) |

### 2.3 Owner Dashboard

| Area | MVP Delivery |
|---|---|
| Calendar view | Day/week view of all bookings; resource columns |
| Create booking | Manual booking on behalf of walk-in or phone customers |
| Cancel/Reschedule | Owner-initiated; triggers email notification |
| Booking list | Table with filters by date, resource, status |
| Customer list | Basic list of customers who have booked; name, phone, email, visit count |
| Page status toggle | "Published" / "Unpublished" switch to take the page offline |

### 2.4 Reliability Guarantees

| Area | MVP Delivery |
|---|---|
| Double-booking prevention | Postgres exclusion constraint on `resource_id + tstzrange` WHERE status IN ('held','confirmed') |
| Booking hold | 10-minute hold during checkout; released on abort or expiry |
| Idempotent submission | Booking create uses a unique idempotency key per attempt |
| Email notifications | Booking confirmation, cancellation, and 24h reminder via Resend |

---

## 3. What's Explicitly Out (Post-MVP)

| Feature | Rationale |
|---|---|
| **Payments / deposits** | MVP treats all bookings as free-to-confirm. Adding payment before the flow is proven risks debugging two hard systems at once. Owner can still collect via GCash manually. |
| **Raffles / campaigns** | Giveaways are a future feature. See [database-schema.md](database-schema.md) for the schema. Ship after core booking experience is proven. |
| **Staff roles & permissions** | MVP assumes the signing owner is the only user. Staff logins, RLS scoping, and role-based UI are Phase 3+. |
| **Recurring bookings** | Low frequency at launch; coach blocks can be created manually one-by-one. |
| **Waitlist** | Nice-to-have; revisit when cancellations are a real pain point for existing users. |
| **Package / credits** | Requires a ledger system. Defer until owners explicitly ask for it. |
| **Discount codes / promotions** | Dependencies on payments and a coupon engine. Post-MVP. |
| **Group bookings** | Capacity > 1 per slot introduces slot-splitting complexity. MVP enforces 1 booking = 1 slot. |
| **Custom domains** | Nice, but owners can link to `app.com/p/{slug}` from their Facebook page. Defer. |
| **Embeddable widget** | Requires a JS SDK and CORS/iframe considerations. Defer to post-MVP. |
| **Multi-language** | MVP is English-only. Filipino toggle post-MVP. |
| **Google Calendar sync** | Outbound scope; revisit after 6 months of data. |
| **Analytics dashboard** | Owner gets booking count and customer list. No funnels, charts, or export. |

---

## 4. Build Sequence

All estimates assume a single full-time developer (Klein). Parallelizable work is noted.

### Sprint 1–2: Foundations (Phase 0)

| Task | Notes |
|---|---|
| Next.js 15 project scaffold + TypeScript strict | App Router, `src/` directory |
| Supabase project + local dev setup | `supabase start`; seed scripts |
| Auth (Supabase Auth) | Email/password + Google OAuth; JWT session handling |
| Org + member model | Tables, RLS policies, sign-up flow auto-creates org |
| shadcn/ui + design tokens | Theme, colors, typography, shared components |
| CI (GitHub Actions) | Type-check, lint, Vitest, Playwright smoke |
| RLS test suite | Simulated multi-tenant assertions in CI |

**Milestone:** Developer can create an org and spawn a new tenant-isolated session.

### Sprint 3–5: Booking Core (Phase 1)

| Task | Notes |
|---|---|
| Location, resource, service CRUD | Owner dashboard pages |
| Operating hours + overrides | Weekly schedule UI; date-specific exceptions |
| Booking table + exclusion constraint | The hardest DB work; validate with parallel e2e test |
| Booking creation (owner side) | Manual booking for walk-ins |
| Calendar view | Day and week columns |
| Booking list + filters | Status, date range, resource |
| Customer list | Aggregated from booking data |

**Milestone:** Owner can configure a business and manually book without double-booking. No public page yet.

### Sprint 6–7: Public Page (Phase 2)

| Task | Notes |
|---|---|
| Public page template | Server-rendered, mobile-first, fast |
| Service listing + date picker | Availability calculated from bookings + hours |
| Time slot grid | Respects duration, buffer, advance notice |
| Customer booking form | Name, email, phone, notes — no auth |
| Booking hold (10-min expiry) | `pg_cron` or Vercel Cron cleanup |
| Idempotent submission | `idempotency_key` UNIQUE constraint |
| Confirmation screen + email | Resend integration |
| Cancellation link (token-based) | Signed token in email; no login required |
| Page publish/unpublish toggle | Owner dashboard |

**Milestone:** **First real business goes live with real customers.** This is the MVP launch gate. Do not proceed beyond this until at least 2–3 friendly businesses have used it for 2 weeks.

### Sprint 8–9: Hardening (MVP Polish)

| Task | Notes |
|---|---|
| Error states and edge cases | Full coverage of booking failure modes |
| Loading skeletons and empty states | Every page |
| Sentry error monitoring | Source maps, user context |
| PostHog event instrumentation | Track funnel: page view → booking started → confirmed |
| SEO basics | Meta tags, OG images for public page |
| Performance audit | Lighthouse > 85 on mobile; p95 booking < 1.5s |
| Mobile tap-target audit | Ensure all form elements are usable on 375px viewport |
| Friendly-business feedback loop | Fix issues discovered by real users |

**Milestone:** Product is stable enough to begin marketing to a wider set of beta users.

---

## 5. MVP Success Criteria

| Metric | Target | Measurement |
|---|---|---|
| Signup → published page completion | > 50% of signups publish | PostHog funnel |
| Median time to publish | < 10 min | PostHog timer event |
| Public page view → booking started | > 20% | PostHog funnel |
| Booking started → confirmed | > 60% | PostHog funnel |
| Zero overlapping confirmed bookings | 100% (hard constraint) | DB exclusion constraint + e2e |
| Booking creation p95 latency | < 1.5s | Sentry performance |
| Email delivery rate | > 98% | Resend dashboard |

---

## 6. Edge Cases & Failure Modes (MVP)

These are documented upfront so they're handled during implementation, not discovered in production:

| Scenario | Handling |
|---|---|
| Two customers submit the same slot simultaneously | Exclusion constraint rejects the second; they see "That slot was just taken — here are three nearest alternatives" |
| Customer closes tab mid-booking | Hold expires in 10 min via `pg_cron`; slot becomes available again |
| Owner changes operating hours with future bookings | Prompt to confirm; any conflicting bookings flagged for manual review |
| Customer uses a disposable email | Accept it — we validate phone via SMS later; tracking via cookie/device fingerprint optional |
| Timezone edge cases (DST, PH only has 1 TZ but customers may travel) | All times stored UTC; displayed in location timezone via `date-fns-tz` |
| Owner accidentally unpublishes page with active bookings | Page goes 404; active bookings remain in DB; email support contact |
| Customer cancels 1 minute before slot | Allowed; no show-up fee in MVP (no payments yet) |
| Browser back-navigation after booking | Idempotency key prevents double-creation; show "Already booked!" screen |

---

## 7. What Success Looks Like (User Story)

> *Marco owns 3 pickleball courts in QC. He signs up at app.com, enters his business name, uploads a logo, and sets his hours (M–F 8am–9pm, Sat 7am–10pm, Sun closed). He adds 3 resources (Court 1, Court 2, Court 3) and one service ("Court Rental — 1hr" at ₱350). He hits Publish and gets a link: app.com/p/marco-pickleball.*
>
> *He posts the link on his Facebook page. A customer clicks it, sees available times for tomorrow, picks 7pm on Court 2, enters their name and number, and gets a confirmation screen and email. Marco sees the booking appear on his dashboard immediately. No double-booking possible. No manual coordination. No "is this slot free?" messages.*
>
> *Total time from Marco's first click to a live booking page: under 10 minutes.*

---

## 8. Post-MVP Roadmap (Preview)

Once the MVP is stable and has validated demand:

| Phase | Timing | Features |
|---|---|---|
| Payments (Phase 3) | Sprint 10–11 | PayMongo/Xendit integration; deposit collection; payment status on bookings |
| Campaigns (Phase 4) | Sprint 12–15 | Raffle engine; tasks; OTP verification; referral system; provably fair draws |
| Team roles | Sprint 16 | Staff accounts; RLS scoping; permissioned UI |
| Monetization (Phase 5) | Sprint 16–17 | Plans, billing, usage limits, upgrade flow |

Actual order will be determined by live owner feedback.
