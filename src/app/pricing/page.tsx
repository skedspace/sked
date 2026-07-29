import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Sparkles,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

import { PLANS } from "@/lib/plans";
import type { Plan, PlanId } from "@/lib/plans";
import { readPlatformPricingConfig } from "@/lib/pricing-config";
import { AnnualSavingsModal } from "./annual-savings-modal";
import { SubscribeButton } from "./subscribe-button";

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
  trial: {},
  monthly: { popular: true, accent: "bg-[#b9f34b]" },
};

const FAQS = [
  {
    q: "What happens when my 14-day trial ends?",
    a: "Your trial lasts 14 days with full access to all features. When it ends, you'll need to subscribe to the Monthly plan to continue accepting bookings. No data is lost — your settings, services, and customers are all preserved.",
  },
  {
    q: "Do I need to enter a credit card to start the trial?",
    a: "No. Your 14-day trial is completely free — no card required. You'll only be asked for payment when you decide to subscribe.",
  },
  {
    q: "Is there a discount for annual billing?",
    a: "Yes. Annual Premium options are available with savings based on the discount settings managed from the SKED admin pricing page.",
  },
  {
    q: "How do payments work for my customers?",
    a: "Each organization controls its own customer payment instructions. You can display GCash QR, bank transfer, cash, or other manual payment options on your booking page.",
  },
  {
    q: "Do you offer non-profit or educational discounts?",
    a: "Reach out to us — we're happy to work something out for qualifying organizations.",
  },
];

function PricingCard({ plan }: { plan: Plan }) {
  const meta = PLAN_META[plan.id];
  const price = formatPrice(plan.priceMonthlyCents);
  const isPopular = meta.popular;
  const isTrial = plan.id === "trial";

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
          <div>
            <span className="text-5xl font-black tracking-[-0.04em]">Free</span>
            <p className="mt-1 text-sm text-muted-foreground">
              for {plan.trialDays} days &middot; no card required
            </p>
          </div>
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
        {isTrial ? <Link
          href="/signup?plan=trial"
          className={`group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none ${
            isPopular
              ? "bg-[#171a16] text-white shadow-[0_6px_16px_rgba(23,26,22,0.15)] hover:bg-black hover:shadow-[0_10px_24px_rgba(23,26,22,0.2)] focus-visible:ring-[#171a16]"
              : "border border-black/15 bg-white/50 text-foreground hover:border-black/30 hover:bg-white focus-visible:ring-black/30"
          }`}
        >
          {isTrial ? "Start free trial" : "Subscribe now"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link> : <SubscribeButton
          termMonths={1}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#171a16] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(23,26,22,0.15)] transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_10px_24px_rgba(23,26,22,0.2)] focus-visible:ring-2 focus-visible:ring-[#171a16] focus-visible:ring-offset-4 focus-visible:outline-none disabled:opacity-60"
        >
          Subscribe now
        </SubscribeButton>}
      </div>
    </article>
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

type PricingConfig = {
  monthlyPriceCents: number;
  trialDays: number;
  oneYearDiscount: number;
  twoYearDiscount: number;
  threeYearDiscount: number;
  features: string[];
  showPlans: boolean;
};

async function getPricingConfig(): Promise<PricingConfig> {
  const config = await readPlatformPricingConfig();
  return {
    monthlyPriceCents: config.monthlyPriceCents,
    trialDays: config.trialDays,
    oneYearDiscount: config.oneYearDiscount,
    twoYearDiscount: config.twoYearDiscount,
    threeYearDiscount: config.threeYearDiscount,
    features: config.features,
    showPlans: config.showPlansToCustomers,
  };
}

export default async function PricingPage() {
  const pricingConfig = await getPricingConfig();
  const plans: Plan[] = pricingConfig.showPlans
    ? [
        {
          ...PLANS.trial,
          trialDays: pricingConfig.trialDays,
          description: `${pricingConfig.trialDays}-day free trial. No card required.`,
        },
        {
          ...PLANS.monthly,
          priceMonthlyCents: pricingConfig.monthlyPriceCents,
          highlights: pricingConfig.features,
        },
      ]
    : [];

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
              Try free for {pricingConfig.trialDays} days.
              <span className="relative ml-2 inline-block">
                Subscribe when you&apos;re ready.
                <span
                  aria-hidden
                  className="absolute right-0 -bottom-1 left-0 -z-10 h-[0.22em] -rotate-1 rounded-full bg-[#b9f34b]"
                />
              </span>
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-8 sm:text-xl">
              No credit card required during your {pricingConfig.trialDays}-day trial. All features included.
              Only pay when you&apos;re ready to go monthly.
            </p>
          </div>
        </section>

        {/* ── Plan cards ── */}
        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-2">
            {plans.length > 0 ? plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            )) : (
              <article className="rounded-[24px] border border-black/[0.09] bg-white p-8 text-center">
                <h3 className="text-xl font-bold">Pricing is currently private</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Contact SKED to discuss the right setup for your organization.
                </p>
                <Link href="/signup" className="mt-6 inline-flex rounded-full bg-[#171a16] px-6 py-3 text-sm font-semibold text-white">
                  Contact us
                </Link>
              </article>
            )}
          </div>
          {plans.length > 0 && (
            <AnnualSavingsModal
              monthlyPriceCents={pricingConfig.monthlyPriceCents}
              oneYearDiscount={pricingConfig.oneYearDiscount}
              twoYearDiscount={pricingConfig.twoYearDiscount}
              threeYearDiscount={pricingConfig.threeYearDiscount}
            />
          )}
        </section>

        {/* ── Feature highlights ── */}
        <section className="bg-[#e9e8df]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
            <SectionHeader
              label="Everything included"
              title="All features, no tiers."
              description="No feature gates. Every organization gets the full SKED platform — trial and monthly subscribers alike."
            />

            <div className="mt-14 mx-auto max-w-2xl">
              <ul className="space-y-4">
                {pricingConfig.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#5f8b12]" strokeWidth={2.5} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <SectionHeader
            label="FAQ"
            title="Questions? Answered."
            description="Everything you need to know about SKED pricing."
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
                Your {pricingConfig.trialDays}-day free trial starts now.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
                No credit card. No commitments. All features included.
              </p>
              <Link
                href="/signup"
                className="group mt-9 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#b9f34b] px-7 text-base font-bold text-[#171a16] transition-all hover:-translate-y-0.5 hover:bg-[#c8ff62] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#171a16] focus-visible:outline-none"
              >
                Start my free trial
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
            &copy; {new Date().getFullYear()} SKED. The simple way for modern businesses to get booked.
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
