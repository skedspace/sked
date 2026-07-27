import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | SKED",
  description: "How SKED collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-4 text-sm text-muted-foreground">Last updated: July 2026</p>

      <section className="mb-8 space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">1. Information We Collect</h2>
        <p>
          When you create an account or make a booking, we collect:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Name, email address, and phone number</li>
          <li>Business information (business name, slug, locations)</li>
          <li>Booking history and preferences</li>
          <li>Payment information (processed securely by our payment provider)</li>
        </ul>

        <h2 className="text-lg font-semibold">2. How We Use Your Information</h2>
        <p>We use your data to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide and maintain the booking platform</li>
          <li>Process bookings and payments</li>
          <li>Send booking confirmations and reminders</li>
          <li>Improve our services and user experience</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 className="text-lg font-semibold">3. Data Sharing</h2>
        <p>
          We do not sell your personal data. We may share data with:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Payment processors (PayMongo/Xendit) to process transactions</li>
          <li>Email service providers (Resend) to send notifications</li>
          <li>Analytics providers (PostHog) to improve our product</li>
        </ul>

        <h2 className="text-lg font-semibold">4. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active. You may
          request deletion of your data by contacting support. Booking records
          are retained for 3 years for business record-keeping purposes.
        </p>

        <h2 className="text-lg font-semibold">5. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Delete your data</li>
          <li>Object to processing</li>
          <li>Data portability</li>
        </ul>

        <h2 className="text-lg font-semibold">6. Contact</h2>
        <p>
          For privacy-related inquiries, contact us at{" "}
          <a href="mailto:privacy@sked.space" className="text-primary hover:underline">
            privacy@sked.space
          </a>.
        </p>
      </section>
    </main>
  );
}
