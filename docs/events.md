# Analytics Events — SKED

All events are sent to **PostHog** via the client-side `useAnalytics()` hook
(`src/lib/analytics.ts`). The PostHog provider lazy-loads `posthog-js` only
when `NEXT_PUBLIC_POSTHOG_KEY` is set.

## Privacy

- **No PII** Ever. Event properties never contain email addresses, full names,
  phone numbers, or IP addresses.
- **Identified-only profiles.** PostHog's `person_profiles` is set to
  `identified_only` — only authenticated owners (who call `identify`) become
  tracked persons.
- **Anonymous customers.** Public booking funnel events are captured without
  `identify`. PostHog still groups them by device ID but never links them to
  a known profile.
- **Booking IDs truncated.** Event properties use only the first 8 characters
  of the booking UUID — never the full ID.
- **No raw email.** `trackSignUp` sets an SHA-like `email_hash` on the user
  profile, never the plain email address.

---

## Owner Setup Funnel

| Event | When | Properties | Privacy |
|---|---|---|---|
| `sign_up` | User successfully registers via email/password | `{ source: "email" }` | No PII. `identify(userId, { email_hash })` sets only a hashed identifier on the person. |
| `onboarding_started` | Owner views the org-setup form | `{}` | No properties. |
| `page_published` | Owner submits the onboarding form and the org/page is created | `{ slug, org_id }` | `org_id` is a UUID (non-PII). `slug` is the business URL slug (public info). |

### Owner funnel — expected event sequence

```
sign_up → onboarding_started → page_published
```

PostHog automatically captures `$pageview` on every client-side navigation,
so you can also build funnels using page URLs (e.g. `/onboarding`, `/dashboard`).

---

## Public Booking Funnel

| Event | When | Properties | Privacy |
|---|---|---|---|
| `service_selected` | Customer taps a service card on the public page | `{ service_id, service_name, payment_mode }` | Service info only — no customer data. |
| `slot_selected` | Customer taps an available time slot | `{ service_name }` | Service name only. |
| `booking_started` | Customer submits the booking form (clicks "Confirm booking") | `{ service_name }` | Triggered **before** the server call — no booking ID yet. |
| `booking_confirmed` | Server confirms the booking and returns a booking ID | `{ booking_id, service_name }` | `booking_id` is truncated to 8 characters. |
| `payment_outcome` | Payment attempt resolves | `{ payment_mode, outcome, amount_cents }` | `outcome`: `"paid"` \| `"pay_later"` \| `"failed"`. No PII. |

### Booking funnel — expected event sequence

```
service_selected → slot_selected → booking_started → booking_confirmed
                                                      └→ payment_outcome (if payment required)
```

For free services, `booking_confirmed` fires without a following `payment_outcome`.
For deposit/full services, `payment_outcome` fires after the user completes
(or skips) payment, and a second `booking_confirmed` may fire from the payment
success path in `PaymentCheckout`.

---

## Automatic Events (PostHog built-in)

| Event | When |
|---|---|
| `$pageview` | Every client-side page navigation (included in `posthog-provider.tsx`) |
| `$autocapture` | Clicks on `[data-ph-capture]` elements (PostHog default, can be toggled) |

---

## Event Properties Reference

All property names use `snake_case` for consistency with PostHog conventions.

| Property | Type | Example | Used In |
|---|---|---|---|
| `source` | `string` | `"email"` | `sign_up` |
| `slug` | `string` | `"marco-pickleball"` | `page_published` |
| `org_id` | `string` (UUID) | `"a1b2...c3d4"` | `page_published` |
| `service_id` | `string` (UUID) | `"svc-..."` | `service_selected` |
| `service_name` | `string` | `"Court Rental"` | `service_selected`, `slot_selected`, `booking_started`, `booking_confirmed` |
| `payment_mode` | `string` | `"free"` \| `"deposit"` \| `"full"` | `service_selected`, `payment_outcome` |
| `booking_id` | `string` (8 chars) | `"a1b2c3d4"` | `booking_confirmed` |
| `outcome` | `string` | `"paid"` \| `"pay_later"` \| `"failed"` | `payment_outcome` |
| `amount_cents` | `number` | `50000` | `payment_outcome` |

---

## Enabling / Disabling

1. **Set env vars** (already in `.env.example`):
   ```env
   NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```
2. **PostHog loads lazily** only when the key is present. If the key is unset,
   all `capture()` / `identify()` calls are no-ops — no errors, no network requests.

---

## Adding a New Event

1. Add a callback function to `useAnalytics()` in `src/lib/analytics.ts`.
2. Call it from the relevant component (must be a `"use client"` component
   rendered inside `<PostHogProvider>`).
3. Add the event to this document.
4. (Optional) Create a PostHog insight / funnel in the PostHog dashboard.
