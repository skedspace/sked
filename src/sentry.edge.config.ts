// This file configures Sentry for the Next.js edge runtime (middleware).
// It's only activated when @sentry/nextjs is installed.
// Until then, this file is inert to avoid blocking the build.

const SENTRY_DSN = process.env.SENTRY_DSN;

let Sentry: any = { init: () => {} };

if (SENTRY_DSN) {
  try {
    const optionalRequire = eval("require") as NodeRequire;
    Sentry = optionalRequire("@sentry/nextjs");
  } catch {
    // Package not installed; skip Sentry.
  }
}

if (SENTRY_DSN && typeof Sentry.init === "function") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
}

export { Sentry };
