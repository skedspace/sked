# Beta Launch Checklist

## Pre-Launch

### Infrastructure
- [ ] **Run `pnpm add @sentry/nextjs posthog-js @posthog/nextjs`** — install monitoring packages
- [ ] **Apply Supabase migration**: `pnpm db:push` (includes plans/subscriptions tables)
- [ ] **Configure environment variables** in Vercel (see `.env.example`)
- [ ] Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`
- [ ] Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`
- [ ] **Set up custom subdomains** via Cloudflare Worker (free):
  - Create a free Cloudflare account → Workers & Pages
  - Deploy `cloudflare-worker.js` as a new Worker
  - In DNS settings, add: `CNAME * → your-worker.workers.dev`
  - The worker auto-routes `businessname.sked.space` → your Vercel page
  - No Vercel Pro upgrade needed
- [ ] **Set up Better Uptime** (or alternative) to monitor `GET /api/health`
- [ ] **Create PostHog dashboards** (see `docs/monitoring.md`)

### Quality
- [ ] **Run e2e tests**: `pnpm test:e2e`
- [ ] **Run test suite**: `pnpm test` + `pnpm test:rls`
- [ ] **Full type check**: `pnpm typecheck`
- [ ] **Lint**: `pnpm lint`

### Content & Legal
- [x] Privacy Policy page (`/privacy`)
- [x] Terms of Service page (`/terms`)
- [x] Cookie consent banner
- [x] Legal links in footer
- [x] `.env.example` file created
- [ ] Set up DMARC/SPF for sending emails (Resend handles this)

---

## Launch Day

### 1. Final verification
- [ ] Deploy latest `main` to Vercel production
- [ ] Verify Sentry captures errors (`SENTRY_DSN` configured)
- [ ] Verify PostHog events are flowing (sign up flow)
- [ ] Verify health check returns 200 at `/api/health`
- [ ] Verify public page loads at `/p/[slug]`
- [ ] Complete a full booking flow as a test customer
- [ ] Verify email confirmation is sent (Resend)

### 2. Beta customer onboarding
- [ ] Reach out to 2–3 friendly businesses (pickleball courts, salons, clinics)
- [ ] Help them create their public page
- [ ] Configure services, hours, and resources
- [ ] Test a booking as a real customer
- [ ] Collect feedback

### 3. Monitoring post-launch
- [ ] Monitor Sentry for new errors (first 48h)
- [ ] Monitor PostHog funnels for drop-off
- [ ] Check database query performance
- [ ] Watch Vercel function duration and cold starts
- [ ] Review Lighthouse scores from CI

---

## Post-Launch (Week 1–2)

### Performance
- [ ] Review Lighthouse CI results; address any regressions
- [ ] Optimize Largest Contentful Paint (LCP) if > 2.5s
- [ ] Optimize First Input Delay (FID) if > 100ms

### Feedback loop
- [ ] Collect feedback from beta customers
- [ ] Prioritize top 3 friction points
- [ ] Schedule fixes in next sprint

### Growth
- [x] "Powered by SKED" on free plan pages
- [ ] Set up referral tracking (PostHog)
- [ ] Consider early-bird pricing for first 20 orgs
