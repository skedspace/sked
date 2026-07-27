import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | SKED",
  description: "Terms and conditions for using SKED.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-4 text-sm text-muted-foreground">Last updated: July 2026</p>

      <section className="mb-8 space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
        <p>
          By using SKED, you agree to these terms. If you do not agree, do not
          use the service.
        </p>

        <h2 className="text-lg font-semibold">2. Description of Service</h2>
        <p>
          SKED provides a scheduling and booking platform for businesses. This
          includes a public booking page, customer management, payment processing,
          and related features.
        </p>

        <h2 className="text-lg font-semibold">3. User Responsibilities</h2>
        <p>You agree to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide accurate business and contact information</li>
          <li>Maintain the confidentiality of your account</li>
          <li>Use the service in compliance with applicable laws</li>
          <li>Not misuse the platform for spam, fraud, or illegal activities</li>
        </ul>

        <h2 className="text-lg font-semibold">4. Payments</h2>
        <p>
          Payment processing is handled by third-party providers. SKED does not
          store full payment credentials. Refunds are at the discretion of the
          business owner.
        </p>

        <h2 className="text-lg font-semibold">5. Limitation of Liability</h2>
        <p>
          SKED is provided &ldquo;as is&rdquo; without warranties. We are not
          liable for damages arising from the use or inability to use the service,
          including lost bookings or revenue.
        </p>

        <h2 className="text-lg font-semibold">6. Cancellation</h2>
        <p>
          You may cancel your account at any time. Upon cancellation, your data
          will be deleted within 30 days. Paid features will remain active until
          the end of your billing period.
        </p>

        <h2 className="text-lg font-semibold">7. Changes to Terms</h2>
        <p>
          We may update these terms. Continued use after changes constitutes
          acceptance. We will notify you of material changes via email.
        </p>

        <h2 className="text-lg font-semibold">8. Contact</h2>
        <p>
          Questions? Email us at{" "}
          <a href="mailto:legal@sked.space" className="text-primary hover:underline">
            legal@sked.space
          </a>.
        </p>
      </section>

      <div className="border-t pt-4 text-center text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        <span className="mx-2">&middot;</span>
        <Link href="/" className="hover:underline">Home</Link>
      </div>
    </main>
  );
}
