import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | SKED",
  description: "How SKED collects, uses, shares, and protects personal information.",
};

const updated = "July 29, 2026";

const sections = [
  {
    title: "1. Scope",
    body: [
      "This Privacy Policy explains how SKED collects, uses, discloses, stores, and protects information when you visit sked.space, create an account, operate an organization workspace, manage bookings, use the admin dashboard, use public booking pages, display live boards, or interact with SKED communications.",
      "SKED is a scheduling, booking, customer-management, live-board, and subscription-management platform for sports facilities, clubs, coaches, and similar service businesses. Organization owners and staff use SKED to manage their operations; customers and players may use SKED-powered public pages to book services, join sessions, or interact with an organization.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "Account and authentication data: name, email address, profile image, login provider identifiers, session information, and role or account-status metadata. If you sign in with Google, SKED receives authentication information needed to create and secure your account.",
      "Organization data: organization name, slug, business details, locations, resources or courts, services, operating hours, payment instructions, page branding, live-board title, live-board tagline, board sponsors, team members, role assignments, subscription status, and configuration settings.",
      "Booking and customer data: customer names, email addresses, phone numbers, booking times, selected services, resources, payment status, notes, packages, discounts, waitlists, no-show or attendance information, and related operational history.",
      "Payment and subscription data: invoice or checkout identifiers, payment provider references, billing term, amount, currency, payment status, subscription status, renewal or trial period, and webhook event records. SKED does not intentionally store full card numbers or bank credentials.",
      "Usage, device, and log data: pages visited, actions taken, feature usage, browser and device information, IP address, approximate region, timestamps, error logs, performance data, and security/audit events.",
      "Cookies and similar technologies: localStorage, service-worker caches, analytics identifiers, authentication cookies, preference storage, and similar technologies used for security, remembering choices, offline display recovery, and product analytics.",
    ],
  },
  {
    title: "3. How We Use Information",
    body: [
      "We use information to provide, secure, maintain, and improve SKED; authenticate users; manage roles and super-admin access; display organization dashboards; process bookings and payments; operate public pages and live boards; manage subscriptions; send transactional messages; provide customer support; prevent fraud or abuse; debug errors; comply with legal obligations; and understand product performance.",
      "Recent platform changes include using Supabase as the production source of truth for admin pricing, platform configuration, organization settings, and board sponsors. Browser-local storage remains used for limited UI preferences, cookie consent, onboarding-tour dismissal, and live-board offline recovery.",
    ],
  },
  {
    title: "4. Legal Bases and Consent",
    body: [
      "Where applicable law requires a legal basis, SKED processes information to perform a contract, pursue legitimate interests such as security and service improvement, comply with legal obligations, protect vital or public interests where relevant, or with your consent.",
      "Strictly necessary cookies and storage are used to provide requested functionality such as authentication, security, and remembering essential settings. Optional analytics or similar technologies should be controlled through consent or preference mechanisms where required by applicable law.",
    ],
  },
  {
    title: "5. How We Share Information",
    body: [
      "We do not sell personal information. We may share information with service providers that help us operate SKED, including Supabase for authentication and database services, Vercel for hosting and deployment, Google for OAuth and calendar-related integrations, PayMongo or other payment processors for payments, Resend for email delivery, PostHog for product analytics, and error-monitoring or infrastructure providers used to secure and maintain the service.",
      "Organization owners and authorized staff can access information associated with their organization, including bookings, customers, players, payments, resources, reports, and team records. Super admins can access platform-level information needed to operate, secure, support, and audit SKED.",
      "We may disclose information when required by law, to protect rights and safety, to investigate abuse or fraud, during a business transfer, or with your direction or consent.",
    ],
  },
  {
    title: "6. Cookies and Similar Technologies",
    body: [
      "SKED uses cookies and similar technologies for authentication, security, remembering cookie consent, maintaining user preferences, improving reliability, and understanding how the product is used. Examples include Supabase authentication cookies, localStorage for cookie consent and onboarding-tour dismissal, service-worker cache cleanup, and board offline cache for live display resilience.",
      "The live-board offline cache stores recent board display state in the browser so a TV or display can continue showing the latest known state if connectivity drops. This is intended as display recovery, not as the system of record.",
      "You can control cookies through your browser settings. Blocking strictly necessary cookies may prevent login or core functionality from working. You can clear localStorage or browser site data to reset device-level preferences.",
    ],
  },
  {
    title: "7. Data Retention",
    body: [
      "We keep information for as long as needed to provide SKED, maintain your account, comply with legal obligations, resolve disputes, enforce agreements, support financial and audit records, and protect the service. Booking, payment, subscription, and audit records may be retained for business, tax, legal, security, and operational recordkeeping.",
      "When an account or organization is deleted, some information may be removed, anonymized, or retained where required or permitted by law, including records needed for billing, fraud prevention, backups, audit logs, and dispute resolution.",
    ],
  },
  {
    title: "8. Security",
    body: [
      "We use technical and organizational measures designed to protect information, including authenticated access, role-based permissions, Supabase row-level security where configured, HTTPS, restricted admin operations, audit logging, and service-provider security controls. No system is perfectly secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "9. International Processing",
    body: [
      "SKED and its service providers may process information in countries other than where you live or where your organization operates. Where required, we rely on appropriate transfer mechanisms and service-provider commitments to protect information.",
    ],
  },
  {
    title: "10. Your Choices and Rights",
    body: [
      "Depending on your location, you may have rights to access, correct, delete, restrict, object to, or receive a copy of your personal information. You may also have the right to withdraw consent where processing is based on consent.",
      "Organization customers or players should first contact the organization that collected their booking information, because that organization may control how the information is used. You may also contact SKED for assistance.",
    ],
  },
  {
    title: "11. Children",
    body: [
      "SKED is not intended for children under 13, and we do not knowingly collect personal information from children under 13. Organizations using SKED are responsible for obtaining any required consent before entering information about minors into the platform.",
    ],
  },
  {
    title: "12. Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. If changes are material, we will take reasonable steps to notify users, such as by updating the date above, posting notice in the product, or sending an email where appropriate.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] px-5 py-10 text-[#151713]">
      <article className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-semibold text-[#4f7d1f] hover:underline">
          Back to SKED
        </Link>
        <header className="mt-6 border-b border-black/10 pb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5d615b]">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Privacy Policy</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5d615b]">
            This policy describes how SKED handles personal information across the website,
            booking tools, owner dashboard, admin dashboard, live boards, integrations, and
            subscription features.
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
            <h2 className="text-xl font-bold text-[#151713]">13. Contact</h2>
            <p>
              For privacy requests or questions, contact{" "}
              <a href="mailto:privacy@sked.space" className="font-semibold text-[#4f7d1f] hover:underline">
                privacy@sked.space
              </a>
              . For legal notices, contact{" "}
              <a href="mailto:legal@sked.space" className="font-semibold text-[#4f7d1f] hover:underline">
                legal@sked.space
              </a>
              .
            </p>
          </section>

          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            This document is provided as a practical SaaS privacy-policy draft and should be reviewed by qualified counsel before production reliance.
          </p>
        </div>
      </article>
    </main>
  );
}
