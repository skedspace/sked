// This file configures Sentry for the browser client.
// It's only activated when @sentry/nextjs is installed.
// Until then, this file is inert to avoid blocking the build.

const SENTRY_DSN =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN
    : undefined;

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
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.5,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  });
}

export { Sentry };
