import { Resend } from "resend";

/**
 * The email channel.
 *
 * `resend@4.8.0` is installed and `RESEND_API_KEY` / `RESEND_FROM_EMAIL` have
 * been validated in env.ts since Phase 2 — but until now nothing in `src/`
 * ever constructed a client. A customer who booked received nothing at all.
 *
 * Two rules govern everything here:
 *
 * 1. **This module never throws.** Every failure is a returned status. A
 *    notification is strictly less important than the booking that triggered
 *    it, and an exception escaping into `createBooking` would cost a customer
 *    their court over a mail-server hiccup.
 * 2. **A missing key is `skipped`, not `failed`.** Both keys are optional in
 *    env.ts, so local development and CI legitimately run without them.
 *    Conflating "not configured" with "delivery broken" would make the health
 *    of the pipeline unreadable the moment we start reporting on it.
 */

export type SendStatus = "sent" | "skipped" | "failed";

export type SendResult = {
  status: SendStatus;
  /** Present for skipped and failed, for logging and future reporting. */
  reason?: string;
  /** Resend's message id, when it accepted the message. */
  id?: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Read directly from process.env rather than importing `env` from env.ts.
 *
 * env.ts validates the whole server schema on import and throws when
 * AUTH_SECRET or SUPABASE_SERVICE_ROLE_KEY are absent. Importing it here would
 * turn a missing unrelated variable into a thrown error inside the one module
 * whose entire contract is that it does not throw.
 */
function config() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() || "",
    from: process.env.RESEND_FROM_EMAIL?.trim() || "",
  };
}

/**
 * Whether email can be sent at all.
 *
 * Callers use this to bail before assembling a message. Without it, an
 * unconfigured deployment still runs four venue lookups per booking to build
 * an email that will be discarded — and in local development, where Supabase
 * may not even be up, those queries fail slowly for no reason.
 */
export function isEmailConfigured(): boolean {
  const { apiKey, from } = config();
  return Boolean(apiKey && from);
}

/** Basic shape check. Resend rejects malformed addresses, but a local guard
 *  turns a wasted round trip into an immediate, explicable skip. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

let warnedMissingConfig = false;

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const { apiKey, from } = config();

  if (!apiKey || !from) {
    // Warn once per process. A booking-rate log line on every send would bury
    // real errors on a busy day.
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn(
        "[notifications] RESEND_API_KEY or RESEND_FROM_EMAIL is not set — emails are being skipped, not sent.",
      );
    }
    return { status: "skipped", reason: "resend_not_configured" };
  }

  if (!message.to || !looksLikeEmail(message.to)) {
    // Public bookings accept a phone number instead of an email, so a customer
    // with no address is an ordinary case, not an error.
    return { status: "skipped", reason: "no_valid_recipient" };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      console.error("[notifications] Resend rejected the message:", error.message);
      return { status: "failed", reason: error.message };
    }

    return { status: "sent", id: data?.id };
  } catch (err) {
    // Network failure, DNS, timeout. Swallowed by design — see rule 1.
    const reason = err instanceof Error ? err.message : "unknown_send_error";
    console.error("[notifications] Email send threw:", reason);
    return { status: "failed", reason };
  }
}

/** Test seam: the once-per-process warning would otherwise leak between tests. */
export function __resetEmailWarningForTests() {
  warnedMissingConfig = false;
}
