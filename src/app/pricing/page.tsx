import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Sparkles,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

import { PLANS } from "@/lib/plans";
import type { Plan, PlanId } from "@/lib/plans";

function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span
      className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] ${
        inverted ? "bg-[#b9f34b] text-[#151713]" : "bg-[#171a16] text-[#b9f34b]"
      }`}
    >
      <CalendarCheck className="h-[19px] w-[19px]" strokeWidth={2.2} />
      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#ff6b4a]" />
    </span>
  );
}

function formatPrice(cents: number): { whole: string; decimal: string } {
  const pesos = cents / 100;
  return {
    whole: Math.floor(pesos).toLocaleString("en-PH"),
    decimal: (pesos % 1).toFixed(2).slice(1),
  };
}

const PLAN_META: Record<PlanId, { popular?: boolean; accent?: string }> = {
  free: {},
  starter: { popular: true, accent: "bg-[#b9f34b]" },
  pro: { accent: "bg-[#171a16]" },
};

const FAQS = [
  {
    q: "Can I switch plans later?",
    a: "Yes. You can upgrade or downgrade anytime. Changes apply immediately, and we prorate the difference.",
  },
  {
    q: "What happens if I exceed my booking limit?",
    a: "We'll notify you as you approach your limit. If you hit it, new bookings are paused until the next cycle or until you upgrade.",
  },
  {
    q: "Is there a discount for annual billing?",
    a: "Not yet, but it's on the roadmap. We'll notify existing subscribers when it launches.",
  },
  {
    q: "Can I try paid features before upgrading?",
    a: "Yes — your first paid feature (e.g. deposits, custom theme) triggers a 14-day free trial of that tier. No card required to start.",
  },
  {
    q: "Do you offer non-profit or educational discounts?",
    a: "Reach out to us — we're happy to work something out for qualifying organizations.",
  },
  {
    q: "How do payments work for my customers?",
    a: "SKED integrates with PayMongo for card and GCash payments. You configure the payment mode per service (free, deposit, or full).",
  },
];

function PricingCard({ plan }: { plan: Plan }) {
  const meta = PLAN_META[plan.id];
  const price = formatPrice(plan.priceMonthlyCents);
  const isPopular = meta.popular;

  return (
    <article
      className={`relative flex flex-col rounded-[24px] border p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(23,26,22,0.1)] ${
        isPopular
          ? "border-[#b9f34b] bg-[#fbfaf4] shadow-[0_8px_32px_rgba(185,243,75,0.18)]"
          : "border-black/[0.09] bg-white"
      }`}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[#b9f34b] px-4 py-1 text-[11px] font-black tracking-[0.12em] text-[#171a16] uppercase shadow-sm">
          <Sparkles className="h-3 w-3" />
          Most popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold">{plan.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
      </div>

      <div className="mb-8">
        {plan.priceMonthlyCents === 0 ? (
          <span className="text-5xl font-black tracking-[-0.04em]">Free</span>
        ) : (
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm font-semibold text-muted-foreground">₱</span>
            <span className="text-5xl font-black tracking-[-0.04em]">
              {price.whole}
            </span>
            <span className="text-lg font-semibold text-muted-foreground">
              {price.decimal}
            </span>
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              /mo
            </span>
          </div>
        )}
      </div>

      <ul className="mb-10 space-y-3">
        {plan.highlights.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm leading-6">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5f8b12]" strokeWidth={2.5} />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Link
          href="/signup"
          className={`group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none ${
            isPopular
              ? "bg-[#171a16] text-white shadow-[0_6px_16px_rgba(23,26,22,0.15)] hover:bg-black hover:shadow-[0_10px_24px_rgba(23,26,22,0.2)] focus-visible:ring-[#171a16]"
              : "border border-black/15 bg-white/50 text-foreground hover:border-black/30 hover:bg-white focus-visible:ring-black/30"
          }`}
        >
          {plan.priceMonthlyCents === 0 ? "Get started free" : "Start free trial"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}

function FeatureRow({ label, free, starter, pro }: { label: string; free: string; starter: string; pro: string }) {
  return (
    <tr className="border-b border-black/[0.06]">
      <td className="py-4 pr-4 text-sm font-medium">{label}</td>
      <td className="py-4 pr-4 text-center text-sm text-muted-foreground">{free}</td>
      <td className="py-4 pr-4 text-center text-sm font-medium">{starter}</td>
      <td className="py-4 text-center text-sm font-medium">{pro}</td>
    </tr>
  );
}

function SectionHeader({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="mb-4 flex items-center justify-center gap-2 text-xs font-black tracking-[0.18em] text-[#4e7410] uppercase">
        <span className="h-px w-6 bg-[#4e7410]/30" />
        {label}
        <span className="h-px w-6 bg-[#4e7410]/30" />
      </p>
      <h2 className="text-4xl leading-[0.98] font-black tracking-[-0.055em] text-balance sm:text-5xl">
        {title}
      </h2>
      <p className="text-muted-foreground mt-5 text-lg leading-8">{description}</p>
    </div>
  );
}

export default function PricingPage() {
  const plans = [PLANS.free, PLANS.starter, PLANS.pro];

  return (
    <div className="home-shell flex min-h-screen flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-black/[0.07] bg-[#f7f6ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="brand-link focus-visible:ring-ring flex items-center gap-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
            aria-label="SKED home"
          >
            <BrandMark />
            <span className="text-lg font-bold tracking-[-0.03em]">sked</span>
          </Link>
          <nav aria-label="Primary navigation" className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/pricing"
              className="rounded-full px-4 py-2 text-sm font-semibold text-foreground"
            >
              Pricing
            </Link>
            <Link
              href={process.env.NODE_ENV !== "production" ? "/dashboard" : "/login"}
              className="text-foreground rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:bg-black/[0.05] sm:px-4"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="group inline-flex min-h-10 items-center gap-2 rounded-full bg-[#171a16] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(23,26,22,0.15)] transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_10px_24px_rgba(23,26,22,0.2)] sm:px-5"
            >
              Start free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative">
          <div className="schedule-grid pointer-events-none absolute inset-0 -z-10 opacity-45" />
          <div className="mx-auto max-w-7xl px-5 pt-20 pb-16 text-center sm:px-8 sm:pt-28 sm:pb-20">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 py-1.5 pr-3.5 pl-2 text-xs font-semibold shadow-sm backdrop-blur">
              <span className="rounded-full bg-[#b9f34b] px-2.5 py-1 text-[10px] font-black tracking-[0.12em] uppercase">
                Pricing
              </span>
              Simple, transparent pricing
            </div>
            <h1 className="text-[clamp(3rem,6vw,5.8rem)] leading-[0.89] font-black tracking-[-0.075em] text-balance">
              Start free.
              <span className="relative ml-2 inline-block">
                Scale when you&apos;re ready.
                <span
                  aria-hidden
                  className="absolute right-0 -bottom-1 left-0 -z-10 h-[0.22em] -rotate-1 rounded-full bg-[#b9f34b]"
                />
              </span>
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-8 sm:text-xl">
              Every plan includes the core booking engine, your public page, and no hidden setup
              fees. Only pay as your business grows.
            </p>
          </div>
        </section>

        {/* ── Plan cards ── */}
        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>

        {/* ── Feature comparison table ── */}
        <section className="bg-[#e9e8df]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
            <SectionHeader
              label="Compare"
              title="Everything across every plan."
              description="Core booking features are free forever. Unlock more capacity, customization, and control as you grow."
            />

            <div className="mt-14 overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-black/10 text-sm font-semibold">
                    <th className="pb-4 pr-4 text-left">Feature</th>
                    <th className="pb-4 pr-4 text-center">Free</th>
                    <th className="pb-4 pr-4 text-center text-[#171a16]">Starter</th>
                    <th className="pb-4 text-center text-[#171a16]">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  <FeatureRow label="Monthly bookings" free="Up to 50" starter="Up to 500" pro="Unlimited" />
                  <FeatureRow label="Resources" free="Up to 5" starter="Up to 20" pro="Unlimited" />
                  <FeatureRow label="Locations" free="1" starter="3" pro="Unlimited" />
                  <FeatureRow label="Team accounts" free="—" starter="Up to 5" pro="Unlimited" />
                  <FeatureRow label="Public page" free="Basic" starter="Custom theme" pro="Custom theme" />
                  <FeatureRow label="Payment collection" free="—" starter="Deposit & full" pro="Deposit & full" />
                  <FeatureRow label="Discount codes" free="—" starter="✓" pro="✓" />
                  <FeatureRow label="Packages / Credits" free="—" starter="✓" pro="✓" />
                  <FeatureRow label="Recurring bookings" free="—" starter="✓" pro="✓" />
                  <FeatureRow label="Google Calendar sync" free="—" starter="✓" pro="✓" />
                  <FeatureRow label="Campaigns & raffles" free="—" starter="—" pro="✓" />
                  <FeatureRow label="Advanced analytics" free="—" starter="—" pro="✓" />
                  <FeatureRow label="API access" free="—" starter="—" pro="✓" />
                  <FeatureRow label="Support" free="Email" starter="Priority" pro="Priority + Slack" />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <SectionHeader
            label="FAQ"
            title="Questions? Answered."
            description="Everything you need to know about SKED pricing and plans."
          />

          <div className="mx-auto mt-14 grid max-w-3xl gap-4">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-[16px] border border-black/[0.09] bg-white p-5 transition-colors open:border-black/20 sm:p-6"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold leading-6 [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <HelpCircle className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" strokeWidth={1.5} />
                </summary>
                <p className="text-muted-foreground mt-4 leading-7">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-5 pb-20 sm:px-8 sm:pb-28">
          <div className="cta-panel reveal-on-scroll relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#171a16] px-6 py-16 text-white sm:px-12 sm:py-20 lg:px-20">
            <div className="cta-ring absolute -top-24 -right-24 h-72 w-72 rounded-full border-[64px] border-[#b9f34b]/90" />
            <div className="cta-square absolute right-24 bottom-10 hidden h-24 w-24 rotate-12 rounded-[24px] bg-[#ff6b4a] lg:block" />
            <div className="relative max-w-3xl">
              <p className="text-xs font-black tracking-[0.18em] text-[#b9f34b] uppercase">
                Ready to get started?
              </p>
              <h2 className="mt-6 text-4xl leading-[0.98] font-black tracking-[-0.055em] text-balance sm:text-6xl">
                Your first 50 bookings are on us.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
                No credit card. No time limit. Just a simple way to get booked.
              </p>
              <Link
                href="/signup"
                className="group mt-9 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#b9f34b] px-7 text-base font-bold text-[#171a16] transition-all hover:-translate-y-0.5 hover:bg-[#c8ff62] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#171a16] focus-visible:outline-none"
              >
                Build my booking page
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-black/[0.08]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5 font-bold tracking-[-0.03em]">
            <BrandMark inverted />
            <span className="text-lg">sked</span>
          </div>
          <p className="text-muted-foreground max-w-md text-sm leading-6">
            © {new Date().getFullYear()} SKED. The simple way for modern businesses to get booked.
          </p>
          <div className="flex items-center gap-5 text-sm font-semibold">
            <Link href="/pricing" className="transition-opacity hover:opacity-55">
              Pricing
            </Link>
            <Link href="/privacy" className="transition-opacity hover:opacity-55">
              Privacy
            </Link>
            <Link href="/terms" className="transition-opacity hover:opacity-55">
              Terms
            </Link>
            <Link
              href={process.env.NODE_ENV !== "production" ? "/dashboard" : "/login"}
              className="transition-opacity hover:opacity-55"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-1 transition-opacity hover:opacity-55"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
