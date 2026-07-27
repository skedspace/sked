# Local Development Setup — SKED

**Last updated:** 2026-07-25
**Stack:** Next.js 15, Supabase (Postgres), Tailwind CSS, shadcn/ui

---

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | ≥ 18.18 (LTS) | Next.js 15 requirement |
| pnpm | ≥ 9.x | Preferred package manager (or npm/bun) |
| Docker Desktop | Latest | Required by `supabase start` for local Postgres |
| Supabase CLI | ≥ 1.200 | Local Supabase management |
| Git | Latest | Version control |
| VS Code | Latest | Recommended editor (workspace settings included) |

### 1.1 Verify Installations

```bash
node --version   # ≥ 18.18
pnpm --version   # ≥ 9.0
docker --version # Docker Desktop running
supabase --version  # ≥ 1.200
```

---

## 2. One-Time Setup

### 2.1 Clone & Install

```bash
git clone <repo-url> sked
cd sked
pnpm install
```

### 2.2 Environment Variables

Copy the example env file and fill in the values:

```bash
cp .env.example .env.local
```

Required variables (see `.env.example` for full list):

| Variable | Source | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings | Client SDK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings | Client SDK |
| `RESEND_API_KEY` | Resend dashboard | Transactional emails |
| `SEMAPHORE_API_KEY` | Semaphore dashboard | SMS OTP |
| `PAYMONGO_SECRET_KEY` | PayMongo dashboard | Payment processing |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Local dev |
| `SENTRY_DSN` | Sentry project settings | Error tracking |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project settings | Analytics |

### 2.3 Start Local Supabase

```bash
# Initialize (first time only — already done if supabase/ directory exists)
supabase init

# Start local services (Postgres, GoTrue, Storage, Realtime)
supabase start

# Apply all migrations
supabase db push

# Seed demo data
supabase db reset
```

This starts:
- Local Postgres on `localhost:54322`
- Supabase Studio on `localhost:54323`
- Auth service on `localhost:54321`

### 2.4 Verify Connection

```bash
# Check Supabase status
supabase status

# Run a quick seed query — should return demo org
pnpm supabase:query "SELECT * FROM organizations"
```

### 2.5 Start Dev Server

```bash
pnpm dev
```

Visit `http://localhost:3000`. You should see the app.

---

## 3. Daily Workflow

### 3.1 Standard Flow

```bash
# 1. Pull latest
git pull --rebase

# 2. Start services if not running
supabase start

# 3. Apply any new migrations
supabase db push

# 4. Start dev
pnpm dev
```

### 3.2 Database Changes

```bash
# Create a new migration
supabase migration new add_column_to_services

# Edit the generated SQL file, then apply
supabase db push

# To reset to seed data (destroys all data)
supabase db reset
```

### 3.3 Running Tests

```bash
# Unit tests
pnpm test

# Unit tests with watch
pnpm test:watch

# E2E tests (requires app + Supabase running)
pnpm test:e2e

# RLS-specific tests
pnpm test:rls
```

### 3.4 Type Generation

After schema changes, regenerate TypeScript types:

```bash
# Generate types from local Supabase
supabase gen types typescript --local > src/lib/database.types.ts

# Or from production (after migration is pushed)
supabase gen types typescript --linked > src/lib/database.types.ts
```

---

## 4. Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Owner dashboard routes
│   │   ├── calendar/      # Calendar view
│   │   ├── bookings/      # Booking management
│   │   ├── customers/     # Customer list
│   │   ├── settings/      # Org settings
│   │   └── page.tsx       # Dashboard home
│   ├── p/                 # Public page routes
│   │   └── [slug]/        # Per-org public page
│   │       ├── page.tsx   # Marketing page
│   │       └── book/      # Booking flow
│   └── api/               # API routes
│       ├── auth/          # Auth callbacks
│       ├── webhooks/      # Payment webhooks
│       └── cron/          # Cron job endpoints
├── components/
│   ├── ui/                # shadcn/ui primitives
│   ├── shared/            # Shared app components
│   ├── booking/           # Booking-specific components
│   └── page-builder/      # Page builder components
├── lib/
│   ├── supabase/          # Supabase client, helpers
│   │   ├── client.ts      # Browser client
│   │   ├── server.ts      # Server client
│   │   └── admin.ts       # Service-role client
│   ├── email/             # React Email templates
│   ├── payments/          # Payment provider helpers
│   └── utils.ts           # Shared utilities
├── hooks/                 # React hooks
├── types/                 # Zod schemas, TS types
└── styles/                # Global styles, theme
```

---

## 5. Git Workflow

### Branch Naming

```
feature/t-0.1.1-project-scaffold
bugfix/booking-overlap-edge-case
chore/upgrade-deps
```

### Commit Convention

```
type(scope): short description

feat(booking): add exclusion constraint for double-booking
fix(availability): respect buffer time on DST boundary
chore(deps): upgrade supabase-js to 2.45
docs(schema): add index documentation
test(rls): add cross-tenant isolation tests
```

---

## 6. Useful Commands

```bash
# Database
pnpm db:push          # Push migrations
pnpm db:reset         # Reset + re-seed
pnpm db:seed          # Run seeds only
pnpm db:types         # Generate TS types

# Testing
pnpm test             # Run unit tests
pnpm test:rls         # Run RLS test suite
pnpm test:e2e         # Run Playwright e2e

# Quality
pnpm lint             # ESLint check
pnpm lint:fix         # Auto-fix
pnpm format           # Prettier format
pnpm typecheck        # tsc --noEmit

# Supabase
pnpm supabase:status  # Show Supabase status
pnpm supabase:stop    # Stop local Supabase
pnpm supabase:studio  # Open Supabase Studio UI
```

---

## 7. Troubleshooting

### Port conflicts
```bash
# Supabase uses ports 54321-54326. If any are in use:
supabase stop
# Change ports in supabase/config.toml, then:
supabase start
```

### Migration failed
```bash
# Check migration status
supabase db diff

# Roll back last migration (if reversible)
# Edit the migration file, then re-run:
supabase db push
```

### Docker not running
```bash
# Start Docker Desktop, then:
supabase start
```

### Type errors after schema change
```bash
pnpm db:types  # Regenerate types
```

### Next.js build errors
```bash
pnpm build     # Full production build
# Check for module resolution, type errors
```

---

*This file is a living document. Update it as tooling and processes evolve.*
