# Monitoring & Observability

## Uptime Monitoring (Better Uptime)

A health endpoint is available at:

```
GET /api/health
```

**Monitor configuration (Better Uptime):**

1. Create a new monitor in Better Uptime
2. URL: `https://sked.space/api/health`
3. Expected status: `200`
4. Check interval: `1 minute`
5. Regions: `Asia Pacific` (primary), `US West` (secondary)
6. Alert contacts: Email to the dev team

**Alternative providers:** Checkly, Pulsetic, or UptimeRobot (free tier).

---

## Error Tracking (Sentry)

- **Project:** sked
- **DSN:** Configured via `SENTRY_DSN` env var in Vercel
- **Config files:**
  - `src/sentry.client.config.ts` — Browser error tracking
  - `src/sentry.edge.config.ts` — Edge runtime (middleware)
  - `src/instrumentation.ts` — Server-side tracing

**Source maps** are uploaded during CI build. See `ci.yml` workflow.

---

## Analytics (PostHog)

- **Project key:** Configured via `NEXT_PUBLIC_POSTHOG_KEY` env var
- **Host:** `NEXT_PUBLIC_POSTHOG_HOST` (defaults to `https://app.posthog.com`)
- **Config:** `src/components/shared/posthog-provider.tsx`
- **Events tracked via** `src/lib/analytics.ts` — see [`docs/events.md`](./events.md) for the complete reference.

**Dashboards to create in PostHog:**
1. **Activation funnel:** `sign_up` → `onboarding_started` → `page_published`
2. **Booking funnel:** `service_selected` → `slot_selected` → `booking_started` → `booking_confirmed`
3. **Payment funnel:** `booking_confirmed` → `payment_outcome` (filter: outcome = `paid`)
