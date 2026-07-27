import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Sparkles,
} from "lucide-react";

import { BLOG_POSTS } from "@/lib/blog";

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

export default function BlogPage() {
  return (
    <div className="home-shell flex min-h-screen flex-col overflow-hidden">
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
              className="text-muted-foreground hover:text-foreground rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[0.05]"
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
        <section className="relative">
          <div className="schedule-grid pointer-events-none absolute inset-0 -z-10 opacity-45" />
          <div className="mx-auto max-w-7xl px-5 pt-20 pb-16 text-center sm:px-8 sm:pt-28 sm:pb-20">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 py-1.5 pr-3.5 pl-2 text-xs font-semibold shadow-sm backdrop-blur">
              <span className="rounded-full bg-[#b9f34b] px-2.5 py-1 text-[10px] font-black tracking-[0.12em] uppercase">
                Blog
              </span>
              Tips & stories for modern businesses
            </div>
            <h1 className="text-[clamp(3rem,6vw,5.8rem)] leading-[0.89] font-black tracking-[-0.075em] text-balance">
              Resources to grow
              <span className="relative ml-2 inline-block">
                your business.
                <span
                  aria-hidden
                  className="absolute right-0 -bottom-1 left-0 -z-10 h-[0.22em] -rotate-1 rounded-full bg-[#b9f34b]"
                />
              </span>
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-8 sm:text-xl">
              Practical guides, tips, and stories to help you run a smoother, more successful business.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 sm:pb-32">
          <div className="grid gap-8 md:grid-cols-2">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-[24px] border border-black/[0.09] bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-black/20 hover:shadow-[0_24px_60px_rgba(23,26,22,0.1)] sm:p-8"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#f0efe8] px-2.5 py-1 text-[10px] font-black tracking-[0.1em] text-[#171a16] uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-xl font-bold tracking-[-0.03em] group-hover:text-[#171a16] transition-colors">
                  {post.title}
                </h2>
                <p className="text-muted-foreground mt-3 leading-7">
                  {post.excerpt}
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-black/[0.07] pt-5">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171a16] text-[10px] font-bold text-white">
                      {post.author.charAt(0)}
                    </span>
                    <div>
                      <p className="font-semibold">{post.author}</p>
                      <p className="text-xs text-muted-foreground">
                        {post.date} · {post.readTime}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

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
            <Link href="/pricing" className="transition-opacity hover:opacity-55">Pricing</Link>
            <Link href="/blog" className="transition-opacity hover:opacity-55">Blog</Link>
            <Link href="/privacy" className="transition-opacity hover:opacity-55">Privacy</Link>
            <Link href="/terms" className="transition-opacity hover:opacity-55">Terms</Link>
            <Link
              href={process.env.NODE_ENV !== "production" ? "/dashboard" : "/login"}
              className="transition-opacity hover:opacity-55"
            >
              Sign in
            </Link>
            <Link href="/signup" className="flex items-center gap-1 transition-opacity hover:opacity-55">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
