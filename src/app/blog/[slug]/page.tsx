import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarCheck } from "lucide-react";

import { getBlogPost, BLOG_POSTS } from "@/lib/blog";

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

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

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
              href="/#pricing"
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
        <article className="mx-auto max-w-3xl px-5 pt-16 pb-24 sm:px-8 sm:pt-20 sm:pb-32">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to blog
          </Link>

          <div className="mb-4 mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#f0efe8] px-2.5 py-1 text-[10px] font-black tracking-[0.1em] text-[#171a16] uppercase"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-4xl leading-[0.98] font-black tracking-[-0.05em] text-balance sm:text-5xl">
            {post.title}
          </h1>

          <div className="mt-6 flex items-center gap-3 text-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171a16] text-xs font-bold text-white">
              {post.author.charAt(0)}
            </span>
            <div>
              <p className="font-semibold">{post.author}</p>
              <p className="text-muted-foreground">
                {post.authorRole} · {post.date} · {post.readTime}
              </p>
            </div>
          </div>

          <div
            className="blog-content prose prose-sm sm:prose-base mt-10 max-w-none prose-headings:mt-10 prose-headings:mb-4 prose-headings:font-bold prose-headings:tracking-[-0.03em] prose-p:leading-8 prose-p:text-muted-foreground prose-a:text-[#171a16] prose-strong:text-foreground prose-ul:my-4 prose-li:leading-8"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {relatedPosts.length > 0 && (
          <section className="border-t border-black/[0.08] bg-[#e9e8df]">
            <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
              <h2 className="text-3xl font-black tracking-[-0.04em]">Continue reading</h2>
              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.slug}
                    href={`/blog/${rp.slug}`}
                    className="group rounded-[24px] border border-black/[0.09] bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-black/20 hover:shadow-[0_24px_60px_rgba(23,26,22,0.1)] sm:p-8"
                  >
                    <h3 className="text-lg font-bold group-hover:text-[#171a16] transition-colors">
                      {rp.title}
                    </h3>
                    <p className="text-muted-foreground mt-3 text-sm leading-7">
                      {rp.excerpt}
                    </p>
                    <p className="text-muted-foreground mt-4 text-xs">
                      {rp.date} · {rp.readTime}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
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
            <Link href="/#pricing" className="transition-opacity hover:opacity-55">Pricing</Link>
            <Link href="/blog" className="transition-opacity hover:opacity-55">Blog</Link>
            <Link href="/privacy" className="transition-opacity hover:opacity-55">Privacy</Link>
            <Link href="/terms" className="transition-opacity hover:opacity-55">Terms</Link>
            <Link href={process.env.NODE_ENV !== "production" ? "/dashboard" : "/login"} className="transition-opacity hover:opacity-55">Sign in</Link>
            <Link href="/signup" className="flex items-center gap-1 transition-opacity hover:opacity-55">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
