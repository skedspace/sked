import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | SKED",
  description: "Terms and conditions for using SKED.",
};

const updated = "July 29, 2026";

const sections = [
  {
    title: "1. Agreement to These Terms",
    body: [
      "These Terms of Service govern your access to and use of SKED, including sked.space, organization dashboards, public booking pages, admin tools, live boards, integrations, subscription features, and related services. By accessing or using SKED, you agree to these Terms.",
      "If you use SKED for an organization, you represent that you have authority to bind that organization. In that case, references to \"you\" include both you and the organization.",
    ],
  },
  {
    title: "2. The SKED Service",
    body: [
      "SKED provides software for scheduling, public booking pages, customer and player records, resources or courts, services, operating hours, payments, reports, discounts, packages, waitlists, campaigns, live game boards, integrations, platform subscriptions, and administrative management.",
      "SKED may add, change, suspend, or remove features over time. Some features may be in preview, beta, or limited release, and may change more frequently.",
    ],
  },
  {
    title: "3. Accounts and Access",
    body: [
      "You must provide accurate account, contact, and organization information. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.",
      "SKED supports authentication through email and Google sign-in. Organization owners and administrators are responsible for assigning appropriate roles to staff and removing access when team members leave.",
      "SKED may suspend or restrict access if we believe an account is compromised, violates these Terms, creates risk for other users, or is required by law.",
    ],
  },
  {
    title: "4. Organization Responsibilities",
    body: [
      "Organizations are responsible for the accuracy of their public pages, booking rules, pricing, availability, payment instructions, cancellation policies, refund decisions, staff access, customer communications, and compliance with laws that apply to their services.",
      "Organizations are responsible for obtaining any rights or permissions needed for logos, sponsor names, sponsor images, branding, customer information, player information, photos, and other content entered into SKED.",
      "If an organization collects information from customers, players, or minors through SKED, the organization is responsible for giving required notices and obtaining required consent.",
    ],
  },
  {
    title: "5. Payments, Subscriptions, and Billing",
    body: [
      "SKED may offer free trials, monthly subscriptions, annual or multi-year terms, custom plans, and other paid features. Prices, discounts, trial periods, auto-renewal settings, and available plans may be updated from the SKED admin pricing tools.",
      "Payments may be processed by third-party payment providers such as PayMongo. Payment providers may have their own terms and privacy practices. SKED does not intentionally store full payment-card numbers or bank credentials.",
      "Unless stated otherwise at purchase, subscription fees are non-refundable except where required by law. If a subscription renews, you authorize the applicable payment provider to charge the selected payment method for the renewal term.",
      "Failure to pay may result in suspension, downgrade, or termination of paid features. Existing bookings and records may remain available for a limited period, subject to these Terms and applicable law.",
    ],
  },
  {
    title: "6. Customer Bookings and Refunds",
    body: [
      "SKED provides tools for organizations to accept and manage bookings. The organization, not SKED, is responsible for providing the booked service, honoring its policies, handling no-shows and cancellations, issuing refunds, and resolving disputes with customers unless SKED separately agrees otherwise in writing.",
    ],
  },
  {
    title: "7. Integrations and Third-Party Services",
    body: [
      "SKED may integrate with third-party services such as Google OAuth, Google Calendar, Supabase, Vercel, PayMongo, Resend, PostHog, and similar providers. Your use of third-party services may be governed by their own terms.",
      "You are responsible for configuring integrations correctly, keeping credentials secure, and ensuring that connected services are authorized for your intended use. SKED is not responsible for third-party outages, changes, or data handling outside SKED's control.",
    ],
  },
  {
    title: "8. Data, Content, and License",
    body: [
      "You retain ownership of content and data you submit to SKED, including organization information, customer records, booking data, services, locations, public-page content, board titles, board sponsors, and uploaded or linked assets.",
      "You grant SKED a limited license to host, process, transmit, display, and use your content and data as necessary to provide, secure, support, improve, and operate the service.",
      "You represent that you have the rights needed to submit content to SKED and that your content does not infringe, misappropriate, or violate the rights of others.",
    ],
  },
  {
    title: "9. Acceptable Use",
    body: [
      "You may not use SKED to violate laws, infringe rights, send spam, commit fraud, distribute malware, scrape or overload the service, interfere with security, bypass access controls, reverse engineer the service except where legally allowed, harass others, upload unlawful or harmful content, or misrepresent your identity or organization.",
      "You may not use SKED to collect sensitive information unless you have a lawful basis and appropriate safeguards. Do not enter payment-card numbers, government IDs, medical records, or other highly sensitive data into free-text fields unless SKED expressly supports that data type.",
    ],
  },
  {
    title: "10. Admin and Platform Controls",
    body: [
      "Platform-level admin features are intended for authorized SKED operators. Super-admin roles, pricing controls, platform configuration, integrations, audit logs, user activation, organization management, and exports must be used only for legitimate operational, support, security, compliance, and administrative purposes.",
      "Unauthorized access to admin tools is prohibited. SKED may log admin activity for security, auditability, and abuse prevention.",
    ],
  },
  {
    title: "11. Availability and Support",
    body: [
      "We aim to provide a reliable service, but SKED may be unavailable due to maintenance, updates, outages, third-party failures, security issues, or events beyond our control. We do not guarantee uninterrupted or error-free operation.",
      "Live-board offline cache and similar browser features are intended to improve display continuity, but they are not a substitute for the Supabase production database or a guarantee that all updates will be available offline.",
    ],
  },
  {
    title: "12. Intellectual Property",
    body: [
      "SKED, including its software, design, branding, workflows, documentation, and platform content, is owned by SKED or its licensors and is protected by intellectual-property laws. These Terms do not transfer ownership of SKED intellectual property to you.",
      "Feedback you provide may be used by SKED without restriction or compensation, provided we do not identify you publicly without permission.",
    ],
  },
  {
    title: "13. Privacy",
    body: [
      "Our Privacy Policy explains how SKED collects, uses, and shares information. By using SKED, you acknowledge the Privacy Policy. Organizations are responsible for their own privacy notices where they collect information from customers and players.",
    ],
  },
  {
    title: "14. Termination",
    body: [
      "You may stop using SKED or request account cancellation at any time. SKED may suspend or terminate access if you violate these Terms, create legal or security risk, fail to pay fees, or misuse the service.",
      "After termination, some provisions survive, including payment obligations, intellectual property, disclaimers, liability limits, dispute provisions, and provisions needed to enforce these Terms.",
    ],
  },
  {
    title: "15. Disclaimers",
    body: [
      "SKED is provided \"as is\" and \"as available.\" To the fullest extent permitted by law, SKED disclaims warranties of merchantability, fitness for a particular purpose, non-infringement, availability, accuracy, and uninterrupted operation.",
      "SKED does not provide legal, tax, accounting, payment-processing, event-management, or professional advice. You are responsible for decisions made using SKED data and reports.",
    ],
  },
  {
    title: "16. Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, SKED will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost revenue, lost bookings, loss of goodwill, data loss, or business interruption.",
      "To the fullest extent permitted by law, SKED's total liability for claims relating to the service will not exceed the amount paid to SKED for the service in the three months before the event giving rise to the claim, or PHP 5,000 if no amount was paid.",
    ],
  },
  {
    title: "17. Indemnity",
    body: [
      "You agree to defend, indemnify, and hold SKED harmless from claims, losses, liabilities, damages, costs, and expenses arising from your content, your organization services, your violation of these Terms, your misuse of SKED, or your violation of law or third-party rights.",
    ],
  },
  {
    title: "18. Changes to These Terms",
    body: [
      "We may update these Terms from time to time. If changes are material, we will take reasonable steps to notify users. Continued use of SKED after the effective date of updated Terms means you accept the updated Terms.",
    ],
  },
  {
    title: "19. Governing Law",
    body: [
      "Unless a mandatory law provides otherwise, these Terms are governed by the laws of the Philippines, without regard to conflict-of-law principles. Courts located in the Philippines will have jurisdiction for disputes that cannot be resolved informally.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] px-5 py-10 text-[#151713]">
      <article className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-semibold text-[#4f7d1f] hover:underline">
          Back to SKED
        </Link>
        <header className="mt-6 border-b border-black/10 pb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5d615b]">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Terms of Service</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5d615b]">
            These terms describe the rules for using SKED as a scheduling,
            booking, dashboard, live-board, and subscription platform.
          </p>
          <p className="mt-4 text-xs font-semibold text-[#6b7068]">Last updated: {updated}</p>
        </header>

        <div className="mt-8 space-y-8 text-sm leading-7 text-[#363a34]">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl font-bold text-[#151713]">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#151713]">20. Contact</h2>
            <p>
              Questions about these Terms may be sent to{" "}
              <a href="mailto:legal@sked.space" className="font-semibold text-[#4f7d1f] hover:underline">
                legal@sked.space
              </a>
              .
            </p>
          </section>

          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            These Terms are a SaaS terms draft informed by common industry provisions and should be reviewed by qualified counsel before production reliance.
          </p>
        </div>

        <footer className="mt-10 border-t border-black/10 pt-5 text-center text-xs text-[#6b7068]">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span className="mx-2">&middot;</span>
          <Link href="/" className="hover:underline">Home</Link>
        </footer>
      </article>
    </main>
  );
}
