# Auth Configuration — Deployed Environments

**Last updated:** 2026-07-30

Two things have to line up for sign-up and sign-in to work on a real
deployment: the app's env vars, and the Supabase project's URL configuration.
The code paths are resilient to a misconfigured allowlist (see
[Redirect handling](#redirect-handling)), but the dashboard settings below are
still what you want in place.

---

## 1. Supabase dashboard settings

**Authentication → URL Configuration**

| Field | Value |
|---|---|
| Site URL | `https://sked.space` (your production origin) |
| Redirect URLs | `https://sked.space/auth/callback`, `https://sked.space/**`, `http://localhost:3000/auth/callback`, `http://localhost:3000/**` |

The app asks Supabase to send users to `/auth/callback?next=…` after they
confirm an email or finish a Google sign-in. **If that URL is not on the
Redirect URLs allowlist, Supabase silently ignores it and redirects to the Site
URL instead** — the visitor lands on the marketing page with a long
`?code=…` or `#access_token=…` string on the end of the URL and stays signed
out. Add both the exact `/auth/callback` entry and a `/**` wildcard for each
origin you deploy (production, preview domains, localhost).

**Authentication → Providers → Email**

- "Confirm email" on means a new account cannot sign in until the emailed link
  is opened. The signup form now says so explicitly. Turn it off if you want
  signup to drop straight into onboarding.
- Custom email templates must use `{{ .ConfirmationURL }}` or
  `{{ .TokenHash }}`; `/auth/callback` handles the `?code=`, `?token_hash=`,
  and `#access_token=` shapes all three produce.

**Authentication → Providers → Google** (only if you use the Google button)

- Authorized redirect URI in Google Cloud console:
  `https://<project-ref>.supabase.co/auth/v1/callback`.

---

## 2. Environment variables

Set these in Vercel (Project → Settings → Environment Variables) for
Production **and** Preview, then redeploy:

| Variable | Why sign-in breaks without it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser client cannot reach the auth server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/onboarding` cannot create the org + membership, so the dashboard keeps bouncing to `/onboarding`; `/admin` cannot read platform roles |
| `NEXT_PUBLIC_APP_URL` | Absolute links in emails and embeds point at localhost |
| `SUPER_ADMIN_EMAIL` | `/admin` answers **404** for every signed-in user |
| `AUTH_SECRET` | Build-time env validation fails |

`DEV_AUTH` / `NEXT_PUBLIC_DEV_AUTH` must **not** be set in any deployed
environment. They swap in a mock Supabase client that grants every visitor a
fake super-admin session. `isDevAuthEnabled()` already refuses to honour them
when `NODE_ENV=production`, but leaving them set makes preview builds lie.

---

## 3. Command Center (`/admin`) access

`/admin` admits a user only when they are a **super admin**, which means either:

1. `app_metadata.platform_role === "super_admin"` on the account, or
2. their email appears in `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_EMAILS`
   (comma-separated).

Anyone else gets a 404 — deliberately, so the route does not advertise itself.
The reason is logged server-side (`[getCurrentAdminAccess] … is not a super
admin`), so check the Vercel function logs before assuming the login failed.

To grant access to an existing account without touching env vars or
redeploying, stamp the role on the account itself:

```bash
SUPABASE_URL=https://xxxx.supabase.co SERVICE_ROLE_KEY=eyJ... node scripts/promote-super-admin.mjs you@example.com
```

The script also confirms the email address if confirmation is still pending.
Both values come from Supabase → Project Settings → API. The account has to
exist first — sign up through `/signup` before running it.

---

## 4. Redirect handling

What the app does with each shape of auth redirect:

| Arrives as | Handled by |
|---|---|
| `/auth/callback?code=…` | `src/lib/auth-routes/callback.ts` — PKCE exchange |
| `/auth/callback?token_hash=…&type=…` | Same file — `verifyOtp` |
| `/?code=…` (Site URL fallback) | `src/middleware.ts` forwards to `/auth/callback` |
| `/#access_token=…` (implicit flow) | `src/components/shared/auth-url-session.tsx` writes the session, then reloads |
| `?error_description=…` / `#error_description=…` | Both paths redirect to `/login?error=auth_failed`, reason logged |

### "auth_failed" on a link that looks correct

`/auth/callback` logs the reason before redirecting — check the Vercel function
logs. The most common one is:

```
[auth/callback] PKCE code verifier not found in storage.
```

The `?code=` exchange needs the code-verifier cookie that the **browser that
started the flow** stored. Opening the confirmation link in a different browser,
or in an email client's built-in webview, loses it. Open the link in the same
browser you signed up in, or switch the project's email template to
`{{ .TokenHash }}`, which has no verifier requirement.

### Dashboard bouncing

After a session exists, `/dashboard` requires an `org_members` row. Users
without one go to `/onboarding`, which creates the organization through
`/api/onboarding` using the service role. A `/dashboard → /onboarding` loop
therefore means either `SUPABASE_SERVICE_ROLE_KEY` is missing or the
`org_members` RLS policies are failing — confirm migrations `00040` and `00041`
are applied (`supabase db push` against the linked project).
