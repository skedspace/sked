# Cloudflare Setup for SKED

## Overview

Cloudflare provides free infrastructure services that SKED uses for DNS, security, performance, and subdomain routing.

**Estimated setup time:** 30 minutes
**Cost:** $0 (all features on the free plan)

---

## 1. DNS & SSL (First Step)

### 1.1 Add your domain
1. Go to **Cloudflare Dashboard → Add a Site**
2. Enter `sked.space`
3. Select the **Free plan**
4. Cloudflare scans your existing DNS records

### 1.2 Update nameservers
Cloudflare will show you two nameservers (e.g., `daisy.ns.cloudflare.com`). At your domain registrar (GoDaddy, Namecheap, etc.), replace the current nameservers with these.

Propagation takes 5–30 minutes. Once active, Cloudflare manages all DNS.

### 1.3 Add DNS records
In Cloudflare DNS settings, add:

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `@` | `sked.vercel.app` | Proxied (orange cloud) |
| CNAME | `www` | `sked.vercel.app` | Proxied |
| CNAME | `*` | `subdomain-router.you.workers.dev` | Proxied |

The `*` wildcard record enables subdomain routing via the Cloudflare Worker.

### 1.4 Enable Full SSL
1. Go to **SSL/TLS → Overview**
2. Select **Full (strict)**
3. Enable **Always Use HTTPS** (toggle on)

---

## 2. Subdomain Router (Cloudflare Worker)

This routes `mybusiness.sked.space` → `sked.space/p/mybusiness`.

### 2.1 Deploy the Worker
1. Go to **Workers & Pages → Create Application → Create Worker**
2. Name it `subdomain-router`
3. Paste the contents of `cloudflare-worker.js`
4. Update the `VERCEL_APP_URL` constant to your actual Vercel URL
5. Click **Deploy**

### 2.2 Configure the route
1. In the Worker dashboard, go to **Triggers → Routes**
2. Add route: `*.sked.space/*`
3. Click **Add**

Test it: visit `test.sked.space` — it should show your public page for slug "test".

---

## 3. Turnstile (Spam-Proof Booking Form)

Cloudflare Turnstile replaces CAPTCHA with a frictionless widget. Users check a box (or nothing at all — it's invisible by default).

### 3.1 Get your keys
1. Go to **Turnstile → Add Site**
2. Site name: `SKED Booking Form`
3. Domain: `sked.space`
4. Widget type: **Invisible** (recommended — no user interaction needed)
5. Copy the **Site Key** and **Secret Key**

### 3.2 Environment variables
Add to Vercel:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAA...
TURNSTILE_SECRET_KEY=0x4AAAA...
```

### 3.3 Integration points

**Booking form** (`booking-form.tsx`):
- Import the Turnstile script
- Render `<Turnstile>` widget before the submit button
- The widget generates a token on form submission
- Send the token with the booking request
- Verify server-side in `booking-actions.ts` using the secret key

**Login form** (`auth-form.tsx`):
- Add Turnstile to prevent brute-force login attempts

**Future implementation:**
```tsx
// Client: Add before submit button
import { Turnstile } from "@marsidev/react-turnstile";

<Turnstile
  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
  onSuccess={(token) => setTurnstileToken(token)}
/>

// Server: Verify in action
async function verifyTurnstile(token: string) {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: `secret=${SECRET}&response=${token}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = await res.json();
  return data.success === true;
}
```

---

## 4. Email Routing (hello@sked.space)

Forward `hello@sked.space`, `support@sked.space`, etc. to your personal inbox — no paid email service needed.

### 4.1 Enable Email Routing
1. Go to **Email → Email Routing → Get started**
2. Select your domain (`sked.space`)
3. Cloudflare will add MX records automatically

### 4.2 Create rules
| Custom address | Destination | Purpose |
|---|---|---|
| `hello@sked.space` | `your@email.com` | General inquiries |
| `support@sked.space` | `your@email.com` | Customer support (can be same inbox) |
| `legal@sked.space` | `your@email.com` | Legal/privacy contacts |
| `noreply@sked.space` | — | Catch-all for system emails (delete or bounce) |

### 4.3 Send From (SMTP)
For sending emails via Resend, Gmail, or any SMTP provider: your `From` address can be `hello@sked.space`. Cloudflare's Email Routing will handle the DKIM/SPF authentication automatically.

---

## 5. Rate Limiting (API Protection)

Protect your booking endpoint from abuse. Limit each IP to 10 booking requests per 10 seconds.

### 5.1 Create a rate limit rule
1. Go to **Security → WAF → Rate limiting rules**
2. Click **Create rule**

| Field | Value |
|---|---|
| Rule name | `Booking API rate limit` |
| If request matches | `(http.host eq "sked.space" and http.request.uri.path contains "/api/book")` |
| Requests period | `10 seconds` |
| Maximum requests | `10` |
| Action | `Block` |
| Response code | `429` |

### 5.2 Optional: Burst protection
Create a second rule for the sign-up endpoint:

| Field | Value |
|---|---|
| Rule name | `Sign-up rate limit` |
| If request matches | `(http.host eq "sked.space" and http.request.uri.path contains "/auth/signup")` |
| Requests period | `60 seconds` |
| Maximum requests | `5` |
| Action | `Block` |

---

## 6. Bot Fight Mode

Blocks known bots from scraping your public pages or submitting spam.

1. Go to **Security → Bots**
2. Toggle **Bot Fight Mode** ON

This is set-it-and-forget-it. No configuration needed.

---

## 7. Web Analytics (Privacy-First)

Lightweight analytics that respects user privacy (no GDPR cookie banner required).

1. Go to **Analytics → Web Analytics**
2. Click **Add a site**
3. Enter `sked.space`
4. Add the provided script tag to your root layout (`layout.tsx`)

The script is minimal (~2KB) and doesn't slow down page loads.

---

## 8. Performance (Automatic)

These are enabled by default when DNS is proxied (orange cloud):

| Feature | Benefit |
|---|---|
| **CDN Caching** | Static assets (CSS, JS, images) are cached at 330+ locations worldwide |
| **Auto Minify** | JS, CSS, and HTML are automatically compressed |
| **HTTP/2 & HTTP/3** | Faster connections, multiplexed requests |
| **Brotli Compression** | Smaller file sizes than gzip |
| **Rocket Loader** | Async JS loading — improves page speed (test before enabling) |

**To verify:** Go to **Speed → Optimization** and toggle:
- Auto Minify: ✅ Enable for JavaScript, CSS, HTML
- Brotli: ✅ Enabled by default
- HTTP/2: ✅ Enabled by default

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| 🥇 | DNS + SSL | 15 min | Required for going live |
| 🥇 | Subdomain Worker | 10 min | Custom URLs for all users |
| 🥈 | Rate Limiting | 5 min | Blocks API abuse |
| 🥈 | Bot Fight Mode | 1 min | Reduces spam traffic |
| 🥉 | Turnstile | 30 min (code) + 5 min (CF) | Stops form spam |
| 🥉 | Email Routing | 10 min | Professional email |
| 🎁 | Web Analytics | 5 min | Visitor insights |
