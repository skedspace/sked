import { describe, it, expect, afterEach, vi } from "vitest";
import {
  bookingConfirmationEmail,
  bookingCancellationEmail,
  bookingReference,
  escapeHtml,
} from "./templates";
import { parseTimeRange } from "./booking-notifications";

const BASE = {
  venueName: "Marco's Pickleball Courts",
  customerName: "Ana Cruz",
  bookingId: "3f9a1c2e-1111-2222-3333-444455556666",
  // 2026-08-10 19:00 Manila = 11:00 UTC. Chosen so a server running in UTC
  // renders a visibly wrong hour if the timezone is ever dropped.
  startsAt: new Date("2026-08-10T11:00:00Z"),
  endsAt: new Date("2026-08-10T12:00:00Z"),
  timezone: "Asia/Manila",
  resourceName: "Court 2",
  serviceName: "Court Booking",
  priceCents: 20000,
  venueEmail: "hello@marco.example",
  venuePhone: "+63 917 000 0000",
};

describe("booking reference", () => {
  it("is stable, short, and derived from the id", () => {
    expect(bookingReference(BASE.bookingId)).toBe("SK-3F9A1C");
    expect(bookingReference(BASE.bookingId)).toBe(bookingReference(BASE.bookingId));
  });

  it("survives an id with no dashes", () => {
    expect(bookingReference("abcdef123456")).toBe("SK-ABCDEF");
  });
});

describe("html escaping", () => {
  it("neutralises the characters that would break out of markup", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("Tom & Jerry's")).toBe("Tom &amp; Jerry&#39;s");
  });

  it("escapes a customer name inside a rendered email", () => {
    // The owner reads these too, so an injected tag is not only the
    // customer's problem.
    const email = bookingConfirmationEmail({
      ...BASE,
      customerName: '<img src=x onerror="alert(1)">',
    });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x");
  });
});

describe("booking confirmation email", () => {
  it("renders times in the venue's timezone, not the server's", () => {
    const email = bookingConfirmationEmail(BASE);
    // 19:00 in Manila. If the zone were dropped on a UTC server this reads 11.
    expect(email.text).toContain("7:00");
    expect(email.text).not.toContain("11:00 AM");
  });

  it("falls back to Asia/Manila rather than throwing on a bad zone", () => {
    const email = bookingConfirmationEmail({ ...BASE, timezone: "Not/AZone" });
    expect(email.text).toContain("7:00");
  });

  it("includes the reference, court, service and amount", () => {
    const email = bookingConfirmationEmail(BASE);
    expect(email.text).toContain("SK-3F9A1C");
    expect(email.text).toContain("Court 2");
    expect(email.text).toContain("Court Booking");
    expect(email.text).toContain("₱200.00");
  });

  it("omits the amount for a free booking", () => {
    const email = bookingConfirmationEmail({ ...BASE, priceCents: 0 });
    expect(email.text).not.toContain("Amount");
  });

  it("never promises a cancellation link, because no cancel route exists", () => {
    // T-2.3.6 is marked done but there is no cancel route and no token table.
    // Linking one here would send customers to a 404.
    const email = bookingConfirmationEmail(BASE);
    expect(email.html).not.toContain("<a ");
    expect(email.text.toLowerCase()).toContain("contact");
  });

  it("still gives an instruction when the venue has no contact details", () => {
    const email = bookingConfirmationEmail({ ...BASE, venueEmail: null, venuePhone: null });
    expect(email.text).toContain("Contact Marco's Pickleball Courts directly");
    expect(email.text).toContain("SK-3F9A1C");
  });

  it("ships a text alternative that is not just stripped html", () => {
    const email = bookingConfirmationEmail(BASE);
    expect(email.text).not.toContain("<");
    expect(email.text.length).toBeGreaterThan(40);
  });
});

describe("booking cancellation email", () => {
  it("includes the reason when one was given", () => {
    const email = bookingCancellationEmail({ ...BASE, reason: "Court flooded" });
    expect(email.text).toContain("Court flooded");
  });

  it("reads correctly with no reason", () => {
    const email = bookingCancellationEmail({ ...BASE, reason: null });
    expect(email.text).toContain("has been cancelled");
    expect(email.subject).toContain("Booking cancelled");
  });
});

describe("parseTimeRange", () => {
  it("parses a quoted tstzrange literal", () => {
    const range = parseTimeRange('["2026-08-10 19:00:00+08","2026-08-10 20:00:00+08")');
    expect(range?.start.toISOString()).toBe("2026-08-10T11:00:00.000Z");
    expect(range?.end.toISOString()).toBe("2026-08-10T12:00:00.000Z");
  });

  it("parses an unquoted literal", () => {
    const range = parseTimeRange("[2026-08-10T11:00:00Z,2026-08-10T12:00:00Z)");
    expect(range?.start.toISOString()).toBe("2026-08-10T11:00:00.000Z");
  });

  it("returns null rather than an Invalid Date", () => {
    // A NaN date would reach Intl and throw inside a notification.
    expect(parseTimeRange(null)).toBeNull();
    expect(parseTimeRange("")).toBeNull();
    expect(parseTimeRange("garbage")).toBeNull();
    expect(parseTimeRange("[not-a-date,also-not)")).toBeNull();
  });
});

describe("email channel degradation", () => {
  const original = { key: process.env.RESEND_API_KEY, from: process.env.RESEND_FROM_EMAIL };

  afterEach(() => {
    process.env.RESEND_API_KEY = original.key;
    process.env.RESEND_FROM_EMAIL = original.from;
    vi.resetModules();
  });

  async function freshSendEmail() {
    vi.resetModules();
    const mod = await import("./email");
    mod.__resetEmailWarningForTests();
    return mod.sendEmail;
  }

  it("skips rather than fails when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    const sendEmail = await freshSendEmail();

    const result = await sendEmail({
      to: "ana@example.com",
      subject: "s",
      html: "<p>h</p>",
      text: "t",
    });

    // "skipped" not "failed": both keys are optional, so local dev and CI
    // legitimately run unconfigured. Conflating the two would make delivery
    // health unreadable.
    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("resend_not_configured");
  });

  it("skips a customer who booked with a phone number and no email", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "bookings@example.com";
    const sendEmail = await freshSendEmail();

    for (const to of ["", "not-an-email", "missing@domain"]) {
      const result = await sendEmail({ to, subject: "s", html: "<p>h</p>", text: "t" });
      expect(result.status, `to="${to}"`).toBe("skipped");
      expect(result.reason).toBe("no_valid_recipient");
    }
  });
});
