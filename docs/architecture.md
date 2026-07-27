# System Architecture — SKED

**Last updated:** 2026-07-25
**Stack:** Next.js 15 (App Router), Supabase Postgres, Tailwind CSS, shadcn/ui

---

## 1. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         NEXT.JS 15 (App Router)                  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Public Page  │  │    Owner      │  │      API Routes      │  │
│  │  (RSC + SEO)  │  │  Dashboard    │  │  (Server Actions)   │  │
│  │  /p/{slug}    │  │  /dashboard/* │  │  /api/*              │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬────────────┘  │
│         │                 │                     │               │
│  ┌──────┴─────────────────┴─────────────────────┴──────────┐   │
│  │                   Server Components                      │   │
│  │          + Server Actions (mutations)                    │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                  │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │              Supabase Client Layer                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐         │   │
│  │  │ client.ts│  │ server.ts│  │  admin.ts    │         │   │
│  │  │ (anon)   │  │ (anon)   │  │ (service_role│         │   │
│  │  └──────────┘  └──────────┘  └──────────────┘         │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼──────────────────────────────────┘
                              │
┌─────────────────────────────┼──────────────────────────────────┐
│                    SUPABASE (Cloud / Local)                     │
│                             │                                  │
│  ┌──────────────────────────┴──────────────────────────┐       │
│  │                 PostgreSQL 15                        │       │
│  │                                                     │       │
│  │  ┌──────────────────────────────────────────────┐   │       │
│  │  │              RLS Policies                     │   │       │
│  │  │  (org_id isolation on every query)            │   │       │
│  │  └──────────────────────────────────────────────┘   │       │
│  │                                                     │       │
│  │  ┌──────────────────────────────────────────────┐   │       │
│  │  │           Exclusion Constraints                │   │       │
│  │  │  (double-booking prevention at DB level)       │   │       │
│  │  └──────────────────────────────────────────────┘   │       │
│  │                                                     │       │
│  │  ┌──────────────────────────────────────────────┐   │       │
│  │  │        SECURITY DEFINER Functions              │   │       │
│  │  │  (public page reads, slot queries)             │   │       │
│  │  └──────────────────────────────────────────────┘   │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  Auth (GoTrue)   │  │    Storage       │                     │
│  │  (Supabase Auth) │  │ (images, uploads) │                     │
│  └──────────────────┘  └──────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────┴───────┐    ┌───────┴───────┐    ┌───────┴────────┐
│    Resend     │    │   Semaphore   │    │ PayMongo/Xendit │
│   (Email)     │    │    (SMS)      │    │   (Payments)    │
└───────────────┘    └───────────────┘    └────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
┌─────────────────────────────┴──────────────────────────────┐
│                      VERCEL (Hosting)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Edge Cache  │  │  Serverless  │  │  Cron Jobs       │   │
│  │  (public     │  │  Functions   │  │  (reminders,     │   │
│  │   pages)     │  │  (API/dash)  │  │   hold expiry)   │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │   Sentry    │  │   PostHog   │                           │
│  │  (Errors)   │  │ (Analytics) │                           │
│  └─────────────┘  └─────────────┘                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Architectural Principles

### 2.1 RLS-Only Multi-Tenancy
- Every org-scoped table has an `org_id` column.
- Row-Level Security (RLS) policies transparently filter by the user's organization membership.
- No application-level tenant filtering. No `WHERE org_id = ?` in application code.
- Public page reads go through `SECURITY DEFINER` functions — anonymous visitors never touch base tables.

### 2.2 Database-Enforced Integrity
- Double-booking prevention is a Postgres **exclusion constraint** on `bookings(resource_id, tstzrange)`, not application logic.
- Payment idempotency enforced with a `UNIQUE` constraint on `provider_ref`.
- Booking holds expire via `pg_cron` (or Vercel Cron), not in-memory timers.

### 2.3 Server-First Rendering
- Public pages are server-rendered React Server Components for fast first paint and OG meta tags.
- Availability data is fetched client-side after initial render (loading skeletons shown immediately).
- Owner dashboard uses client components where interactivity is needed (calendar picker, drag-and-drop).

### 2.4 Service Role Isolation
- The Supabase `service_role` key is used **only** by:
  - A small audited server-only module for admin operations
  - Webhook handlers (need cross-org write access)
  - Cron job functions
- All user-facing requests use the `anon` key with RLS.

---

## 3. Key Data Flows

### 3.1 Booking Flow

```
Customer                     Next.js                     Supabase
   │                          │                            │
   │   Visit /p/{slug}        │                            │
   │─────────────────────────►│                            │
   │                          │  get_public_page(slug)     │
   │                          │  (SECURITY DEFINER)        │
   │                          │───────────────────────────►│
   │                          │◄───── page + services ─────│
   │◄───── SSR HTML ──────────│                            │
   │                          │                            │
   │   Select date            │                            │
   │─────────────────────────►│                            │
   │                          │  get_available_slots()     │
   │                          │  (SECURITY DEFINER)        │
   │                          │───────────────────────────►│
   │                          │◄───── slot list ──────────│
   │◄───── slots ────────────│                            │
   │                          │                            │
   │   Submit booking         │                            │
   │─────────────────────────►│                            │
   │                          │  Server Action:            │
   │                          │  1. INSERT booking (held)  │
   │                          │  2. Exclusion constraint   │
   │                          │     validates overlap      │
   │                          │───────────────────────────►│
   │                          │◄── CONFLICT or SUCCESS ───│
   │                          │                            │
   │  If success:             │                            │
   │◄──── confirmation ──────│                            │
   │                          │  Trigger Resend email      │
   │                          │─────────────────► (async)  │
```

### 3.2 Payment Webhook Flow

```
PayMongo/Xendit            Next.js                    Supabase
     │                        │                          │
     │  POST /api/webhooks/   │                          │
     │  payment.succeeded     │                          │
     │───────────────────────►│                          │
     │                        │  1. Check idempotency    │
     │                        │     (provider_ref UNIQUE)│
     │                        │─────────────────────────►│
     │                        │◄──── exists? no ────────│
     │                        │                          │
     │                        │  2. INSERT payment       │
     │                        │  3. UPDATE booking       │
     │                        │     status → 'confirmed' │
     │                        │─────────────────────────►│
     │                        │◄──── success ───────────│
     │                        │                          │
     │                        │  4. Trigger email        │
     │◄──── 200 OK ──────────│                          │
```

### 3.3 Availability Engine Flow

```
                   ┌─────────────────┐
                   │  Request:        │
                   │  service_id +    │
                   │  date range      │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  1. Resolve      │
                   │  eligible        │
                   │  resources       │
                   │  (service_res.)  │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  2. Get operating│
                   │  hours for       │
                   │  each weekday    │
                   │  in range        │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  3. Apply        │
                   │  hour_overrides  │
                   │  (holidays,      │
                   │   closures)      │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  4. Generate     │
                   │  slot candidates │
                   │  (duration +     │
                   │   buffers)       │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  5. Subtract     │
                   │  existing        │
                   │  bookings        │
                   │  (held/confirmed)│
                   │  with buffers    │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  6. Apply        │
                   │  min_notice &    │
                   │  max_advance     │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  Return sorted  │
                   │  available      │
                   │  slots          │
                   └─────────────────┘
```

---

## 4. Component Architecture

```
Public Page Flow:

/p/[slug]                     → RSC: Layout + SEO metadata
  ├── PageHero                → Cover image, logo, business name
  ├── PageServices            → Service cards with prices
  ├── PageAbout               → Bio section
  ├── PageGallery             → Optional image gallery
  ├── PageContact             → Contact info, social links
  └── PageScheduler           → Client component
       ├── DatePicker         → Select date (shadcn Calendar)
       ├── TimeSlotGrid       → Available slots (highlighted)
       ├── BookingForm        → Name, email, phone, notes
       └── BookingConfirm     → Success state with .ics

Owner Dashboard Flow:

/dashboard                    → Layout + nav
  ├── TodayView               → Today's bookings, check-in actions
  ├── Calendar                → Day/week/resource views
  ├── Bookings                → List with filters, status badges
  ├── Customers               → Customer list, history, spend
  ├── Settings                → Org profile, hours, resources
  │   ├── LocationForm
  │   ├── HoursEditor
  │   ├── ResourceManager
  │   └── ServiceManager
  ├── PageEditor              → Theme picker, section reorder
  └── Reports                 → Revenue, utilization charts
```

---

## 5. Security Model

```
                         ┌─────────────────────────────┐
                         │     Anonymous Visitor        │
                         │  (no auth, no session)       │
                         └─────────────┬───────────────┘
                                       │
                                       ▼
                         ┌─────────────────────────────┐
                         │  SECURITY DEFINER Functions  │
                         │  (get_public_page,           │
                         │   get_available_slots)       │
                         └─────────────────────────────┘
                                       │
                         Only whitelisted columns
                         exposed. No write access.

                         ┌─────────────────────────────┐
                         │     Authenticated User       │
                         │  (anon key + JWT via RLS)    │
                         └─────────────┬───────────────┘
                                       │
                         ┌─────────────┴───────────────┐
                         │        RLS Policies          │
                         │  org_id IN (                 │
                         │   SELECT org_id FROM         │
                         │   org_members                │
                         │   WHERE user_id = auth.uid() │
                         │  )                           │
                         └─────────────┬───────────────┘
                                       │
                  ┌────────────────────┼──────────────────┐
                  │                    │                  │
          ┌───────┴───────┐   ┌───────┴───────┐  ┌──────┴──────┐
          │  owner role   │   │  staff role   │  │  customer   │
          │  full access  │   │  no payments, │  │  own data   │
          │  read/write   │   │  no settings  │  │  only       │
          └───────────────┘   └───────────────┘  └─────────────┘
```

---

## 6. External Service Dependencies

| Service | Purpose | Criticality | Fallback |
|---|---|---|---|
| **Supabase** | Database, Auth, Storage | **High** — everything depends on it | Local Supabase for dev |
| **Vercel** | Hosting, Edge Cache, Cron | **High** — production runtime | — |
| **Resend** | Transactional email | **Medium** — booking confirmations | Manual email as last resort |
| **Semaphore** | SMS OTP | **Medium** — phone verification | Twilio (backup provider) |
| **PayMongo/Xendit** | Payment processing | **Medium** — deposits | Mark-as-paid manually |
| **Sentry** | Error tracking | **Low** — observability | Console logs |
| **PostHog** | Analytics, funnels | **Low** — product metrics | — |

---

## 7. Cron Jobs

| Job | Schedule | Purpose |
|---|---|---|
| `release-expired-holds` | Every 5 minutes | Release `held` bookings older than 15 min |
| `send-reminders` | Every 30 minutes | Send 24h and 2h booking reminders |
| `cleanup-audit-log` | Daily | Archive audit log entries older than 90 days |

---

*This document is a living reference. Update it as the architecture evolves.*
