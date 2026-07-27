import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
  Globe2,
  HelpCircle,
  Palette,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
} from "lucide-react";
import { BLOG_POSTS } from "@/lib/blog";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { FeatureAccordion } from "@/components/ui/accordion-feature-section";

const features = [
  {
    icon: Globe2,
    number: "01",
    title: "One link. Your whole club.",
    description:
      "A polished club page and court booking flow at one memorable URL--ready for every bio, post, and message.",
    className: "lg:col-span-2",
  },
  {
    icon: CalendarDays,
    number: "02",
    title: "Availability that thinks ahead",
    description:
      "Hours, buffers, notice periods, and service durations work together automatically.",
    className: "",
  },
  {
    icon: Users,
    number: "03",
    title: "Zero-friction booking",
    description:
      "No account. No app. Players choose a court, clinic, or open-play slot and confirm in a few taps.",
    className: "",
  },
  {
    icon: Palette,
    number: "04",
    title: "Recognizably yours",
    description:
      "Bring your logo, imagery, story, and socials. SKED stays quietly in the background.",
    className: "",
  },
  {
    icon: ShieldCheck,
    number: "05",
    title: "Built for the real world",
    description:
      "Holiday overrides, court pricing, smart buffers, and clear player records give operators control without complexity.",
    className: "lg:col-span-2",
  },
];

const steps = [
  {
    number: "01",
    title: "Add the essentials",
    description:
      "Set your courts, rates, hours, and the small details that keep your schedule moving.",
  },
  {
    number: "02",
    title: "Make it feel like you",
    description:
      "Add your logo, cover, bio, and links. Preview everything before you publish.",
  },
  {
    number: "03",
    title: "Share once. Get booked.",
    description:
      "Put your SKED link anywhere and let players find a court time that works.",
  },
];

const testimonialsData = [
  {
    text: "SKED cut our no-show rate from 22% to under 3%. Automated reminders and easy rescheduling keep our prime-time courts full.",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
    name: "Maya Reyes",
    role: "Riverside Pickleball Club",
  },
  {
    text: "I was spending hours on the phone assigning courts. Now players book themselves, and our front desk can focus on the club.",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
    name: "James Tan",
    role: "JT Court House",
  },
  {
    text: "The public page looks like a real website. Our members love seeing court availability and booking without creating an account.",
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    name: "Sofia Lim",
    role: "Bloom Pickleball",
  },
  {
    text: "Setting up SKED took less than 10 minutes. The customization options match our club brand, and players love the smooth booking flow.",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    name: "Carlos Mendez",
    role: "Luna Paddle Club",
  },
  {
    text: "Our indoor courts run entirely on SKED now. Open play, private lessons, waitlists--it handles everything beautifully.",
    image: "https://randomuser.me/api/portraits/women/5.jpg",
    name: "Priya Sharma",
    role: "Sage Pickleball Center",
  },
  {
    text: "The support team guided our court setup, membership rules, and deposits so our launch week stayed calm.",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
    name: "Zara Patel",
    role: "Northline Pickleball Club",
  },
  {
    text: "SKED tightened up our daily court operations. Staff can see bookings, payments, and player details in one intuitive dashboard.",
    image: "https://randomuser.me/api/portraits/men/7.jpg",
    name: "Omar Hassan",
    role: "Dink Factory Courts",
  },
  {
    text: "The court calendar, reminders, and player profiles transformed our workflow and made busy evenings much easier to run.",
    image: "https://randomuser.me/api/portraits/women/8.jpg",
    name: "Leila Kim",
    role: "Metro Paddle Yard",
  },
  {
    text: "The smooth implementation exceeded expectations. It streamlined court scheduling and improved utilization across our facility.",
    image: "https://randomuser.me/api/portraits/women/9.jpg",
    name: "Aisha Patel",
    role: "Ace Pickleball Club",
  },
];

const firstColumn = testimonialsData.slice(0, 3);
const secondColumn = testimonialsData.slice(3, 6);
const thirdColumn = testimonialsData.slice(6, 9);

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

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] lg:mx-0">
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-full bg-[#b9f34b]/25 blur-3xl"
      />
      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[#fbfaf4] shadow-[0_28px_90px_rgba(18,23,16,0.16)]">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171a16] text-sm font-semibold text-white">
              AP
            </span>
            <div>
              <p className="text-sm font-semibold text-[#171a16]">
                Ace Pickleball
              </p>
              <p className="text-xs text-[#6e716b]">Court schedule</p>
            </div>
          </div>
          <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[#50534e]">
            June 2026
          </span>
        </div>

        <div className="grid grid-cols-[46px_repeat(4,minmax(0,1fr))] px-4 pt-4 pb-5 sm:grid-cols-[56px_repeat(4,minmax(0,1fr))] sm:px-6">
          <div />
          {[
            ["MON", "15"],
            ["TUE", "16"],
            ["WED", "17"],
            ["THU", "18"],
          ].map(([day, date], index) => (
            <div
              key={day}
              className={`pb-3 text-center ${
                index === 2 ? "text-[#171a16]" : "text-[#858981]"
              }`}
            >
              <span className="block text-[9px] font-bold tracking-[0.16em]">
                {day}
              </span>
              <span
                className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  index === 2 ? "bg-[#171a16] text-white" : ""
                }`}
              >
                {date}
              </span>
            </div>
          ))}

          {["9 AM", "10 AM", "11 AM", "12 PM"].map((time, rowIndex) => (
            <div key={time} className="contents">
              <span className="border-t border-black/[0.07] pt-3 text-[10px] font-medium text-[#979a94]">
                {time}
              </span>
              {[0, 1, 2, 3].map((columnIndex) => {
                const isCourt1 = rowIndex === 0 && columnIndex === 2;
                const isCourt2 = rowIndex === 1 && columnIndex === 0;
                const isCourt3 = rowIndex === 2 && columnIndex === 3;
                return (
                  <div
                    key={columnIndex}
                    className="relative min-h-16 border-t border-l border-black/[0.07] p-1 sm:min-h-[72px]"
                  >
                    {isCourt1 && (
                      <div className="appointment-pill absolute inset-x-1 top-1 rounded-lg bg-[#b9f34b] p-2 text-[#171a16] shadow-sm">
                        <p className="truncate text-[10px] font-bold sm:text-xs">
                          Court 1 · Singles
                        </p>
                        <p className="mt-0.5 text-[9px] opacity-65">
                          9:00 · Mia &amp; Jen
                        </p>
                      </div>
                    )}
                    {isCourt2 && (
                      <div className="appointment-pill absolute inset-x-1 top-1 rounded-lg bg-[#dce8ff] p-2 text-[#1e3f78]">
                        <p className="truncate text-[10px] font-bold sm:text-xs">
                          Court 3 · Doubles
                        </p>
                        <p className="mt-0.5 text-[9px] opacity-65">
                          10:00 · The Ralliers
                        </p>
                      </div>
                    )}
                    {isCourt3 && (
                      <div className="appointment-pill absolute inset-x-1 top-1 rounded-lg bg-[#ffddd5] p-2 text-[#6f2818]">
                        <p className="truncate text-[10px] font-bold sm:text-xs">
                          Court 2 · Clinic
                        </p>
                        <p className="mt-0.5 text-[9px] opacity-65">
                          11:00 · Coach Sam
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="float-card absolute -bottom-8 -left-2 flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 pr-5 shadow-[0_18px_50px_rgba(18,23,16,0.15)] sm:-left-10">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171a16] text-[#b9f34b]">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#171a16]">New booking</p>
          <p className="text-xs text-[#777a74]">Just now · Court 1</p>
        </div>
      </div>

      <div className="absolute -top-5 -right-2 hidden -rotate-2 items-center gap-2 rounded-full border border-black/10 bg-[#ff6b4a] px-4 py-2 text-xs font-semibold text-white shadow-lg sm:flex">
        <Sparkles className="h-3.5 w-3.5" />
        Courts filling up
      </div>

      <div className="orbit-badge absolute -right-5 bottom-7 hidden h-16 w-16 items-center justify-center rounded-full border border-dashed border-black/20 bg-[#f7f6ef] text-[9px] font-black tracking-[0.14em] text-black/50 uppercase lg:flex">
        <span>4 open</span>
      </div>
    </div>
  );
}

const trustedPickleballBrands = [
  "Pickle Park",
  "The Picklr",
  "Pickleball Union",
  "Rally Pickleball",
  "Pickleville",
  "Ace Pickleball Club",
];

function MarketingLogo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="SKED home">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[#b9f34b] text-[#b9f34b]">
        <svg
          className="h-7 w-7"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8 18.5 13.8 24 25 8"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.5"
          />
          <path
            d="M25 8v15.5A3.5 3.5 0 0 1 21.5 27h-13A3.5 3.5 0 0 1 5 23.5v-15A3.5 3.5 0 0 1 8.5 5H20"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>
      </span>
      <span className="text-3xl font-black tracking-[-0.05em] text-white">
        sked
      </span>
    </Link>
  );
}

function MarketingHero() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-[#050b0f] text-white">
      <img
        src="/images/newbg.webp"
        alt=""
        className="absolute inset-0 -z-30 h-full w-full object-cover object-bottom"
      />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_42%_30%,rgba(185,243,75,0.16),transparent_26%),linear-gradient(90deg,rgba(5,11,15,0.50)_0%,transparent_22%,transparent_78%,rgba(5,11,15,0.50)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#050b0f] to-transparent" />

      <nav className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-6 sm:px-10 lg:px-16">
        <MarketingLogo />
        <div className="hidden items-center gap-12 text-base font-semibold text-white/88 lg:flex">
          <a href="#features" className="hover:text-[#b9f34b]">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-[#b9f34b]">
            Solutions
          </a>
          <a href="#blog" className="hover:text-[#b9f34b]">
            Resources
          </a>
          <Link href="/pricing" className="hover:text-[#b9f34b]">
            Pricing
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={
              process.env.NODE_ENV !== "production" ? "/dashboard" : "/login"
            }
            className="hidden text-base font-semibold text-white/88 hover:text-white sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-14 items-center gap-3 rounded-full bg-[#b9f34b] px-7 text-sm font-black text-[#071004] shadow-[0_18px_50px_rgba(185,243,75,0.25)] transition hover:-translate-y-0.5 hover:bg-[#c8ff62] sm:px-9 sm:text-base"
          >
            Start free trial
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </nav>

      <div className="mx-auto grid max-w-[1480px] gap-10 px-5 pt-10 pb-36 sm:px-10 lg:grid-cols-[minmax(0,0.98fr)_minmax(520px,1.02fr)] lg:px-16 lg:pt-14 lg:pb-44">
        <div className="max-w-2xl">
          <p className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#b9f34b] px-4 py-2 text-xs font-black tracking-[0.16em] text-white uppercase">
            <span className="h-2 w-2 rounded-full bg-[#b9f34b]" />
            All-in-one pickleball booking platform
          </p>
          <h1 className="text-[clamp(3.6rem,7.2vw,6.9rem)] leading-[0.92] font-black tracking-[-0.055em] text-white">
            Smarter
            <span className="block text-[#b9f34b]">pickleball</span>
            scheduling
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-white/78 sm:text-xl">
            SKED helps facilities, clubs, and players manage courts, bookings,
            payments, and communities in one smart platform.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-[#b9f34b] px-8 text-base font-black text-[#071004] transition hover:-translate-y-0.5 hover:bg-[#c8ff62]"
            >
              Start free 14-day trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-14 items-center justify-center rounded-full border border-white/28 bg-white/5 px-8 text-base font-bold text-white backdrop-blur-md transition hover:bg-white/12"
            >
              Book a demo
            </a>
          </div>
          <div className="mt-8 grid gap-4 text-sm font-medium text-white/82 sm:grid-cols-3">
            {[
              "No credit card",
              "Setup in under 2 minutes",
              "Cancel anytime",
            ].map((item) => (
              <span key={item} className="flex items-center gap-3">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-[#b9f34b] text-[#b9f34b]">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[520px] lg:min-h-[640px]">
          <div className="hidden lg:block absolute top-12 right-4 w-[min(15rem,75vw)] rounded-2xl border border-white/20 bg-white/[0.08] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-[#b9f34b]" />
              <p className="text-sm font-semibold text-white/88">
                Courts booked today
              </p>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-black tracking-[-0.05em]">76%</p>
                <p className="mt-1 text-xs text-white/78">vs yesterday</p>
              </div>
              <svg
                className="h-8 w-20 text-[#b9f34b]"
                viewBox="0 0 150 70"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 62C18 56 26 48 39 50C53 52 57 41 71 43C86 45 90 54 103 48C116 42 121 27 133 23C139 21 143 14 146 9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
              </svg>
            </div>
          </div>

          <div className="hidden lg:block absolute top-1/2 right-4 w-[min(15rem,75vw)] -translate-y-1/2 rounded-2xl border border-white/20 bg-white/[0.08] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-[#b9f34b]" />
              <p className="text-sm font-semibold text-white/88">
                Upcoming match
              </p>
            </div>
            <p className="mt-3 text-base font-semibold tracking-[-0.03em]">
              Doubles Clash
            </p>
            <p className="mt-1 text-sm text-white/78">Sat, May 24 - 8:00 AM</p>
            <div className="mt-3 flex items-center">
              {["AR", "ML", "CP"].map((person) => (
                <span
                  key={person}
                  className="-mr-2 grid h-8 w-8 place-items-center rounded-full border-2 border-white/70 bg-[#b9f34b] text-[10px] font-black text-[#071004]"
                >
                  {person}
                </span>
              ))}
              <span className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/14 text-xs font-bold text-white">
                +6
              </span>
            </div>
          </div>

          <div className="hidden lg:block absolute right-4 bottom-16 w-[min(15rem,75vw)] rounded-2xl border border-white/20 bg-white/[0.08] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-6 w-6 text-[#b9f34b]" />
              <div>
                <p className="text-xs text-white/78">New booking</p>
                <p className="mt-0.5 text-sm font-semibold">Court 3</p>
                <p className="mt-0.5 text-xs text-white/78">May 24 - 7:00 AM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="trusted-marquee border-t border-white/10 bg-black/32 py-6 backdrop-blur-md lg:absolute lg:inset-x-0 lg:bottom-0">
        <div className="mx-auto flex max-w-[1480px] items-center gap-8 overflow-hidden px-5 sm:px-10 lg:px-16">
          <p className="shrink-0 text-xs font-bold tracking-[0.22em] text-white/58 uppercase">
            Trusted by pickleball communities
          </p>
          <div className="h-6 w-px shrink-0 bg-white/18" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="trusted-marquee-track flex w-max items-center gap-8">
              {[...trustedPickleballBrands, ...trustedPickleballBrands].flatMap(
                (brand, index) => [
                  <span
                    key={`brand-${index}`}
                    className="min-w-36 text-center text-sm font-black tracking-[-0.05em] text-white/62 uppercase grayscale transition hover:text-white"
                    aria-hidden={index >= trustedPickleballBrands.length}
                  >
                    {brand}
                  </span>,
                  <i
                    key={`dot-${index}`}
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9f34b]"
                  />,
                ],
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="home-shell bg-background flex min-h-screen flex-col overflow-hidden">
      <header className="hidden">
        <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="brand-link focus-visible:ring-ring flex items-center gap-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
            aria-label="SKED home"
          >
            <BrandMark />
            <span className="text-lg font-bold tracking-[-0.03em]">sked</span>
          </Link>
          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-1 sm:gap-3"
          >
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground hidden rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[0.05] md:inline-flex"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-muted-foreground hover:text-foreground hidden rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[0.05] md:inline-flex"
            >
              How it works
            </a>
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[0.05]"
            >
              Pricing
            </Link>
            <a
              href="#blog"
              className="text-muted-foreground hover:text-foreground hidden rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[0.05] md:inline-flex"
            >
              Blog
            </a>
            <Link
              href={
                process.env.NODE_ENV !== "production" ? "/dashboard" : "/login"
              }
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
        <MarketingHero />

        <section className="hidden">
          <div className="schedule-grid pointer-events-none absolute inset-0 -z-10 opacity-45" />
          <div className="mx-auto grid w-full max-w-7xl items-center gap-16 px-5 pt-16 pb-24 sm:px-8 sm:pt-20 lg:grid-cols-[0.93fr_1.07fr] lg:gap-12 lg:pt-24 lg:pb-32">
            <div className="max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 py-1.5 pr-3.5 pl-2 text-xs font-semibold shadow-sm backdrop-blur">
                <span className="rounded-full bg-[#b9f34b] px-2.5 py-1 text-[10px] font-black tracking-[0.12em] uppercase">
                  New
                </span>
                Your courts, bookable in minutes
              </div>
              <h1 className="text-[clamp(3.3rem,7vw,6.8rem)] leading-[0.89] font-black tracking-[-0.075em] text-balance">
                Legacy hero.
                <span className="relative block w-fit">
                  Disabled.
                  <span
                    aria-hidden
                    className="absolute right-0 -bottom-1 left-1 -z-10 h-[0.22em] -rotate-1 rounded-full bg-[#b9f34b]"
                  />
                </span>
              </h1>
              <p className="text-muted-foreground mt-8 max-w-xl text-lg leading-8 text-balance sm:text-xl">
                A beautiful club page and a smart court scheduler, together in
                one link. Less admin for you. A smoother yes for your players.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="group focus-visible:ring-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#171a16] px-7 text-base font-semibold text-white shadow-[0_10px_24px_rgba(23,26,22,0.18)] transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_14px_30px_rgba(23,26,22,0.24)] focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
                >
                  Build my court page
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-black/15 bg-white/50 px-7 text-base font-semibold transition-colors hover:border-black/30 hover:bg-white"
                >
                  See how it works
                </a>
              </div>
              <div className="text-muted-foreground mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#5f8b12]" strokeWidth={2.5} />
                  No card required
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#5f8b12]" strokeWidth={2.5} />
                  Live in under 10 minutes
                </span>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>



        <section id="features" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-[#4e7410] uppercase mb-3">
              <WandSparkles className="h-4 w-4" />
              Everything in sync
            </div>

            <h2 className="text-4xl leading-[0.98] font-black tracking-[-0.055em] text-balance sm:text-6xl max-w-3xl mb-4">
              Built to make booking feel effortless.
            </h2>
            <p className="text-muted-foreground max-w-2xl text-lg leading-8 mb-14">
              The page, calendar, and player journey all work as one -- so
              there is less to manage and nothing to stitch together.
            </p>

            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              {/* Left — Product showcase */}
              <ProductPreview />

              {/* Right — Feature pills */}
              <div className="flex flex-col gap-3">
                {features.map((feature, index) => (
                  <div
                    key={feature.number}
                    className="group flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 transition-all duration-200 hover:border-black/[0.14] hover:shadow-[0_8px_24px_rgba(23,26,22,0.08)] hover:translate-x-1"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base ${
                        index === 0
                          ? "bg-[#b9f34b] text-[#171a16]"
                          : "bg-[#f0efe8] text-[#171a16]"
                      }`}
                    >
                      <feature.icon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#171a16]">
                        {feature.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#6e716b]">
                        {feature.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-extrabold tracking-[0.14em] text-black/[0.18]">
                      {feature.number}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 bg-[#e9e8df]">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-[#4e7410] uppercase mb-4">
                <Clock3 className="h-4 w-4" />
                How it works
              </p>
              <h2 className="text-4xl leading-[0.98] font-black tracking-[-0.055em] text-balance sm:text-6xl">
                From idea to live before your next coffee.
              </h2>
              <p className="text-muted-foreground mt-5 max-w-md text-lg leading-8">
                No developer, design degree, or complicated setup. If you know
                your courts, you already know everything you need.
              </p>
            </div>

            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-black/10" aria-hidden />

              <ol className="space-y-0">
                {steps.map((step, index) => (
                  <li key={step.number} className="relative flex gap-6 pb-12 last:pb-0">
                    {/* Numbered circle */}
                    <span
                      className={`relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        index === 0
                          ? "bg-[#b9f34b] text-[#171a16]"
                          : "bg-white text-[#171a16] border border-black/10"
                      }`}
                    >
                      {step.number}
                    </span>
                    <div className="min-w-0 pt-1.5">
                      <h3 className="text-xl font-bold tracking-[-0.03em] sm:text-2xl">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground mt-2 max-w-lg text-base leading-7 sm:text-lg">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="bg-white relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-col items-center justify-center max-w-[540px] mx-auto">
              <div className="flex justify-center">
                <div className="border py-1 px-4 rounded-lg text-xs font-black tracking-[0.18em] text-[#4e7410] uppercase">
                  Testimonials
                </div>
              </div>
              <h2 className="mx-auto mt-4 max-w-2xl text-center text-4xl leading-[0.98] font-black tracking-[-0.055em] text-balance sm:text-5xl">
                What court operators say
              </h2>
              <p className="text-muted-foreground mt-5 text-center text-lg leading-8">
                See how pickleball clubs and facilities use SKED to stay booked.
              </p>
            </div>

            <div className="flex justify-center gap-6 mt-14 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
              <TestimonialsColumn testimonials={firstColumn} duration={15} />
              <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
              <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-[#e9e8df]">
          <div className="reveal-on-scroll mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <p className="flex items-center justify-center gap-2 text-xs font-black tracking-[0.18em] text-[#4e7410] uppercase">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </p>
            <h2 className="mx-auto mt-4 max-w-2xl text-center text-4xl leading-[0.98] font-black tracking-[-0.055em] text-balance sm:text-5xl">
              Questions? Answered.
            </h2>
            <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-center text-lg leading-8">
              Everything you need to know about getting started with SKED.
            </p>

            <div className="mx-auto mt-14 max-w-3xl space-y-3">
              {[
                {
                  q: "How long does it take to set up?",
                  a: "Most clubs go live in under 10 minutes. Add your courts, rates, hours, and share your link. No design or development skills needed.",
                },
                {
                  q: "Do players need to create an account?",
                  a: "No. Players book directly from your public page -- no sign-up, no app download. Just pick a court time, enter their details, and confirm.",
                },
                {
                  q: "What happens if a player doesn't show up?",
                  a: "You can mark a no-show in the dashboard. SKED tracks no-show rates per player and can automatically block repeat offenders from booking.",
                },
                {
                  q: "Can I take payments through SKED?",
                  a: "Yes. You can collect deposits or full payments via card or GCash through our PayMongo integration. Set it per court booking, clinic, or event — free, deposit, or full payment.",
                },
                {
                  q: "Is there a mobile app?",
                  a: "We don't have a standalone mobile app yet, but the dashboard works perfectly in any mobile browser. A native app is on the roadmap.",
                },
                {
                  q: "Can I cancel my subscription anytime?",
                  a: "Yes. There are no lock-in contracts. You can downgrade or cancel from the dashboard at any time. If you cancel, you keep access until the end of your billing period.",
                },
              ].map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-[20px] border border-black/[0.06] bg-white p-5 transition-all duration-200 open:border-black/14 open:shadow-[0_4px_16px_rgba(23,26,22,0.06)] sm:p-6"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-base leading-6 font-semibold [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <svg
                      className="text-muted-foreground h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <p className="text-muted-foreground mt-4 leading-7">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Latest from the blog ── */}
        <section id="blog" className="scroll-mt-24 bg-white">
          <div className="reveal-on-scroll mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-[#4e7410] uppercase">
                  <WandSparkles className="h-4 w-4" />
                  Latest from the blog
                </p>
                <h2 className="mt-4 text-4xl leading-[0.98] font-black tracking-[-0.055em] text-balance sm:text-5xl">
                  Resources to grow your pickleball club.
                </h2>
              </div>
              <Link
                href="/blog"
                className="hidden shrink-0 items-center gap-1.5 rounded-full border border-black/[0.09] bg-[#f7f6ef] px-4 py-2 text-sm font-semibold transition-all hover:border-black/20 hover:shadow-sm sm:inline-flex"
              >
                View all posts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {BLOG_POSTS.slice(0, 3).map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group rounded-[24px] border border-black/[0.06] bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-black/14 hover:shadow-[0_12px_40px_rgba(23,26,22,0.08)] sm:p-8"
                >
                  <div className="mb-3 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#f0efe8] px-2.5 py-1 text-[10px] font-black tracking-[0.1em] text-[#171a16] uppercase"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-lg font-bold tracking-[-0.02em] transition-colors group-hover:text-[#171a16]">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-7">
                    {post.excerpt}
                  </p>
                  <p className="text-muted-foreground mt-4 text-xs">
                    {post.date} · {post.readTime}
                  </p>
                </Link>
              ))}
            </div>

            <Link
              href="/blog"
              className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-black/[0.09] bg-[#f7f6ef] px-4 py-2 text-sm font-semibold transition-all hover:border-black/20 hover:shadow-sm sm:hidden"
            >
              View all posts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="bg-[#e9e8df]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-col items-center text-center mb-6">
              <p className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-[#4e7410] uppercase mb-4">
                <WandSparkles className="h-4 w-4" />
                Everything your court needs
              </p>
              <h2 className="max-w-2xl text-4xl leading-[0.98] font-black tracking-[-0.055em] text-balance sm:text-5xl">
                Run your pickleball facility without the headache.
              </h2>
              <p className="text-muted-foreground mt-5 max-w-lg text-lg leading-8 text-center">
                From court booking to member management — SKED handles the hard part.
              </p>
            </div>
            <FeatureAccordion />
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-[#050b0f] text-white">
          <img
            src="/images/cta3.webp"
            alt=""
            className="absolute inset-0 -z-30 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_42%_30%,rgba(185,243,75,0.16),transparent_26%),linear-gradient(90deg,rgba(5,11,15,0.50)_0%,transparent_22%,transparent_78%,rgba(5,11,15,0.50)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#050b0f] to-transparent" />

          <div className="mx-auto grid max-w-[1480px] gap-10 px-5 py-28 sm:px-10 sm:py-36 lg:grid-cols-[minmax(520px,1fr)_1fr] lg:px-16">
            <div className="max-w-2xl">
              <p className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#b9f34b] px-4 py-2 text-xs font-black tracking-[0.16em] text-white uppercase">
                <span className="h-2 w-2 rounded-full bg-[#b9f34b]" />
                Your next booking is closer than you think
              </p>
              <h2 className="text-[clamp(2.8rem,5.5vw,5.5rem)] leading-[0.92] font-black tracking-[-0.055em] text-white">
                Make it easier
                <span className="block text-[#b9f34b]">to say yes.</span>
              </h2>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/78 sm:text-xl">
                Create your club page, share one link, and give players a better
                way to book a court.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-[#b9f34b] px-8 text-base font-black text-[#071004] shadow-[0_18px_50px_rgba(185,243,75,0.25)] transition hover:-translate-y-0.5 hover:bg-[#c8ff62]"
                >
                  Create my club page
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div />
          </div>
        </section>
      </main>

      <footer className="bg-[#f7f6ef]">
        <div className="border-t border-black/[0.06]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-6 sm:px-8 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-[#979a94]">
              &copy; {new Date().getFullYear()} SKED. All rights reserved.
            </p>
            <div className="flex gap-6 text-xs text-[#979a94]">
              <span>Built for modern pickleball operators.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
