// This file is used by @sentry/nextjs to create the Sentry client
// on the server side. It runs in the Node.js runtime.
// The build-time instrumentation is handled by sentry.edge.config.ts
// and sentry.client.config.ts.

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import ensures Sentry is only loaded when SENTRY_DSN is set
    const SENTRY_DSN = process.env.SENTRY_DSN;
    if (!SENTRY_DSN) return;

    // Lazy-load Sentry to avoid hard crashes when unconfigured or uninstalled.
    let Sentry: any;
    try {
      const optionalRequire = eval("require") as NodeRequire;
      Sentry = optionalRequire("@sentry/nextjs");
    } catch {
      return;
    }

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.25 : 1.0,
      // Source maps are uploaded during CI build via sentry-cli
    });
  }
}
