/**
 * SKED Subdomain Router — Cloudflare Worker
 *
 * Deploy this worker to route *.sked.space subdomain requests
 * to the correct public page on Vercel (no Pro plan needed).
 *
 * Setup:
 *   1. Go to https://dash.cloudflare.com → Workers & Pages
 *   2. Create a new Worker, paste this code
 *   3. Deploy it
 *   4. Go to your domain's DNS → add:
 *      CNAME  *  →  your-worker.your-subdomain.workers.dev
 *      (or use Cloudflare proxied A/AAAA records)
 *
 * Cost: Free (100k requests/day on Workers free plan)
 */

// Canonical app URL. Keep this pointed at the apex app to avoid tying
// subdomain routing to a specific Vercel account URL.
const VERCEL_APP_URL = "https://sked.space";

// Reserved subdomains that should NOT be routed to public pages
const RESERVED = new Set([
  "www", "app", "api", "admin", "dashboard", "auth", "mail",
  "support", "help", "status", "docs", "blog", "dev", "staging",
  "localhost",
]);

const worker = {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname;

    // Check if this is a subdomain request (e.g. mybusiness.sked.space)
    const parts = host.split(".");
    const isSubdomain = parts.length >= 3;

    if (isSubdomain) {
      const subdomain = parts[0].toLowerCase();

      if (!RESERVED.has(subdomain)) {
        // Rewrite the request to the Vercel-hosted public page
        const targetUrl = `${VERCEL_APP_URL}/p/${subdomain}${url.pathname === "/" ? "" : url.pathname}${url.search}`;
        return fetch(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
      }
    }

    // For apex domain (sked.space) or reserved subdomains, pass through
    return fetch(request);
  },
};

export default worker;
