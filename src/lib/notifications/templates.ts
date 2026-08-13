/**
 * Notification templates.
 *
 * Deliberately plain strings rather than React Email components: `react-email`
 * is in package.json but `@react-email/components` and `@react-email/render`
 * are NOT installed, and no dependency could be added here (`pnpm` is not on
 * PATH and `corepack pnpm` fails a signature check). Plain templates also keep
 * this module pure and synchronous, so every branch is unit-testable without a
 * renderer or a network.
 *
 * Every template returns both `html` and `text`. Text is not a nicety: a
 * multipart message with a real text alternative is materially less likely to
 * be filtered as spam, which matters when the MVP success criteria include an
 * email delivery rate above 98%.
 */

export type BookingEmailData = {
  venueName: string;
  customerName: string;
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  /** IANA zone from the org's settings. Never the server's local zone. */
  timezone: string;
  resourceName: string | null;
  serviceName: string | null;
  priceCents: number;
  /** Shown so the customer has a way to reach the venue — see the note on
   *  cancellation below. Omitted entirely when the venue has set neither. */
  venueEmail?: string | null;
  venuePhone?: string | null;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

/**
 * A short, human-quotable reference derived from the booking UUID.
 *
 * T-2.3.4 claims a confirmation code exists; no such column does. Deriving one
 * avoids a migration and stays stable for a given booking, which is the only
 * property that matters when a customer reads it down the phone. It is not a
 * secret and must never be used to authenticate anything.
 */
export function bookingReference(bookingId: string): string {
  return `SK-${bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;
}

/**
 * Escapes text before it is interpolated into the HTML part.
 *
 * Customer-supplied names reach both the customer's mail client and the
 * owner's, so an unescaped `<` is a real injection surface, not a theoretical
 * one. Applied to every interpolated value without exception.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInZone(date: Date, timezone: string, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat("en-PH", { ...options, timeZone: timezone }).format(date);
  } catch {
    // An invalid IANA zone makes Intl throw. Falling back to Asia/Manila is
    // better than throwing inside a notification and losing the message —
    // and it is the app's default zone everywhere else.
    return new Intl.DateTimeFormat("en-PH", { ...options, timeZone: "Asia/Manila" }).format(date);
  }
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(cents / 100);
}

/** The when/where block, shared by every booking template. */
function detailRows(data: BookingEmailData): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Reference", bookingReference(data.bookingId)],
    ["Date", formatInZone(data.startsAt, data.timezone, { dateStyle: "full" })],
    [
      "Time",
      `${formatInZone(data.startsAt, data.timezone, { timeStyle: "short" })} – ${formatInZone(
        data.endsAt,
        data.timezone,
        { timeStyle: "short" },
      )}`,
    ],
  ];
  if (data.resourceName) rows.push(["Court", data.resourceName]);
  if (data.serviceName) rows.push(["Booking", data.serviceName]);
  if (data.priceCents > 0) rows.push(["Amount", formatMoney(data.priceCents)]);
  return rows;
}

function contactLine(data: BookingEmailData): string | null {
  const parts = [data.venueEmail, data.venuePhone].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function layout(heading: string, intro: string, rows: Array<[string, string]>, footer: string): string {
  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#5f695c;font-size:14px;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#071420;font-size:14px;font-weight:700;text-align:right;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f7f8f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 12px;font-size:24px;color:#071420;">${escapeHtml(heading)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#5f695c;">${escapeHtml(intro)}</p>
        <table role="presentation" style="width:100%;border-top:1px solid #e7e9e2;border-bottom:1px solid #e7e9e2;">
          ${rowsHtml}
        </table>
        <p style="margin:24px 0 0;font-size:13px;line-height:22px;color:#5f695c;">${escapeHtml(footer)}</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function plain(heading: string, intro: string, rows: Array<[string, string]>, footer: string): string {
  const body = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  return `${heading}\n\n${intro}\n\n${body}\n\n${footer}\n`;
}

export function bookingConfirmationEmail(data: BookingEmailData): RenderedEmail {
  const rows = detailRows(data);
  const heading = `You're booked at ${data.venueName}`;
  const intro = `Hi ${data.customerName}, your booking is confirmed. Here are the details.`;

  // No cancellation link. T-2.3.6 claims magic-link cancellation exists; there
  // is no cancel route and no token table, so promising one here would send
  // customers to a 404. Pointing at the venue is the honest instruction until
  // that is built.
  const contact = contactLine(data);
  const footer = contact
    ? `Need to change or cancel? Contact ${data.venueName} at ${contact}. Quote reference ${bookingReference(data.bookingId)}.`
    : `Need to change or cancel? Contact ${data.venueName} directly and quote reference ${bookingReference(data.bookingId)}.`;

  return {
    subject: `Booking confirmed — ${data.venueName}, ${formatInZone(data.startsAt, data.timezone, { dateStyle: "medium" })}`,
    html: layout(heading, intro, rows, footer),
    text: plain(heading, intro, rows, footer),
  };
}

export function bookingCancellationEmail(data: BookingEmailData & { reason?: string | null }): RenderedEmail {
  const rows = detailRows(data);
  const heading = `Your booking at ${data.venueName} was cancelled`;
  const intro = data.reason
    ? `Hi ${data.customerName}, this booking has been cancelled. Reason given: ${data.reason}`
    : `Hi ${data.customerName}, this booking has been cancelled.`;

  const contact = contactLine(data);
  const footer = contact
    ? `Questions? Contact ${data.venueName} at ${contact}.`
    : `Questions? Contact ${data.venueName} directly.`;

  return {
    subject: `Booking cancelled — ${data.venueName}, ${formatInZone(data.startsAt, data.timezone, { dateStyle: "medium" })}`,
    html: layout(heading, intro, rows, footer),
    text: plain(heading, intro, rows, footer),
  };
}
