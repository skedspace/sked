export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  tags: string[];
  image?: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-your-business-needs-online-booking",
    title: "Why your pickleball club needs online court booking",
    excerpt:
      "Stop playing phone tag. Online court booking is what players expect. Here's how it keeps courts full and operations calm.",
    content: `
      <p>If you're still taking court bookings over the phone, you're working harder than you need to.</p>
      <p>Online booking has shifted from a nice-to-have to a must-have. Players expect to reserve courts, clinics, and open-play sessions instantly, online, without a phone call.</p>
      <h2>The cost of phone-only booking</h2>
      <p>Every missed call is a missed court reservation. Even when staff pick up, each phone booking can turn into minutes of back-and-forth on court availability, partner counts, deposits, and time slots.</p>
      <p>That adds up. For a club handling 20 phone bookings a day, that's over an hour spent coordinating court time every single day.</p>
      <h2>What online booking changes</h2>
      <ul>
        <li><strong>No more phone tag.</strong> Players see real-time court availability and book instantly.</li>
        <li><strong>Fewer no-shows.</strong> Automated reminders via email reduce no-show rates by up to 80%.</li>
        <li><strong>24/7 booking.</strong> Your booking page never sleeps. Players can reserve courts at midnight, on weekends, or during holidays.</li>
        <li><strong>Less admin work.</strong> You focus on running the facility, not chasing court schedules.</li>
      </ul>
      <h2>Start small, grow fast</h2>
      <p>The best part? You don't need a website overhaul. With SKED, you get a beautiful club page and court booking engine in one link. Share it on your socials, add it to your email signature, or embed it on your existing site.</p>
      <p>Your first 50 bookings are free. No card required.</p>
    `,
    author: "SKED Team",
    authorRole: "Product",
    date: "2026-07-24",
    readTime: "3 min read",
    tags: ["clubs", "tips"],
  },
  {
    slug: "how-to-reduce-no-shows",
    title: "7 proven ways to reduce pickleball court no-shows",
    excerpt:
      "No-shows waste prime court time. Here's how pickleball operators can cut them down without adding friction for players.",
    content: `
      <p>No-shows leave courts empty during slots another player would have taken. But there's good news: most no-shows are preventable.</p>
      <h2>1. Make booking easy</h2>
      <p>The harder it is to book, the easier it is to forget. When players reserve through a frictionless online flow, they're more invested in keeping the court time.</p>
      <h2>2. Send automated reminders</h2>
      <p>A single email reminder 24 hours before reduces no-shows by 40%. A second reminder 2 hours before brings it down by 70%.</p>
      <h2>3. Require a deposit</h2>
      <p>Even a small deposit creates commitment. Court reservations that require a deposit are much less likely to disappear at game time.</p>
      <h2>4. Make cancellation easy</h2>
      <p>Paradoxically, making it easier to cancel reduces no-shows. When players can cancel online, they do it early--freeing up the court for someone else.</p>
      <h2>5. Track no-show patterns</h2>
      <p>Use data to identify repeat offenders. SKED automatically tracks no-show rates per player so you can make informed decisions.</p>
      <h2>6. Send a 'we're ready for you' message</h2>
      <p>A quick text or email on the day builds excitement and reinforces the appointment in their mind.</p>
      <h2>7. Overbook strategically</h2>
      <p>Once you understand your no-show patterns, you can safely overbook high-demand slots—just make sure you have a waitlist to fill cancellations.</p>
      <p>With SKED, reminders, deposit collection, waitlists, and no-show tracking all work out of the box. Start protecting your court time today.</p>
    `,
    author: "Maya Reyes",
    authorRole: "Guest Contributor",
    date: "2026-07-18",
    readTime: "4 min read",
    tags: ["tips", "operations"],
  },
  {
    slug: "building-a-brand-your-customers-trust",
    title: "Building a pickleball club brand players trust",
    excerpt:
      "You don't need a marketing agency or a six-figure budget to build a club brand players remember. Here's what actually matters.",
    content: `
      <p>Brand isn't your logo. It's what people say about you when you leave the room.</p>
      <p>For pickleball facilities, brand is everything. It's the reason a player chooses your courts over another facility nearby. It's what justifies your pricing. It's what turns a one-time visitor into a member.</p>
      <h2>Start with consistency</h2>
      <p>Consistency is the foundation of trust. Use the same colors, fonts, and tone everywhere--your website, your social media, your booking page, your email responses.</p>
      <h2>Your booking page is a brand touchpoint</h2>
      <p>When a player lands on your booking page, they're making a snap judgment about your facility. Does it look professional? Does it feel like your club? SKED's public page lets you bring your logo, imagery, and story front and center.</p>
      <h2>Deliver a great experience</h2>
      <p>The best marketing is a happy player. Every smooth booking, every on-time court start, every thoughtful follow-up builds your brand.</p>
      <h2>Show your personality</h2>
      <p>Don't be afraid to let your personality shine. Share your courts, introduce your coaches, and write copy that sounds like you.</p>
      <p>Your brand is built one interaction at a time. Make every one count.</p>
    `,
    author: "SKED Team",
    authorRole: "Product",
    date: "2026-07-10",
    readTime: "3 min read",
    tags: ["brand", "tips"],
  },
  {
    slug: "guide-to-service-packages",
    title: "The complete guide to court packages and prepaid bookings",
    excerpt:
      "Court packages boost revenue, improve cash flow, and lock in player loyalty. Here's how to create and sell them effectively.",
    content: `
      <p>Court packages--sometimes called class cards, session bundles, or membership credits--are one of the best tools for pickleball clubs.</p>
      <h2>Why packages work</h2>
      <ul>
        <li><strong>Better cash flow:</strong> Get paid upfront for future sessions.</li>
        <li><strong>Player retention:</strong> Players with unused sessions keep coming back.</li>
        <li><strong>Higher average value:</strong> Players spend more per visit when they buy in bulk.</li>
        <li><strong>Predictable revenue:</strong> Smooth out seasonal dips with prepaid commitments.</li>
      </ul>
      <h2>What to offer</h2>
      <p>The most popular package structures are:</p>
      <ul>
        <li><strong>Court bundles:</strong> Buy 5 hours, get 1 free. Great for regular doubles groups and league players.</li>
        <li><strong>Monthly memberships:</strong> Fixed fee for X reservations or open-play sessions per month.</li>
        <li><strong>Credit systems:</strong> Buy credits that can be used across courts, clinics, lessons, and events.</li>
      </ul>
      <h2>How to price packages</h2>
      <p>A good rule of thumb: offer a 10–20% discount over single-session pricing. The discount should be attractive enough to commit upfront but not so steep that it hurts your margins.</p>
      <p>With SKED, you can create packages, set prices and session counts, and players redeem sessions directly through their booking flow. All tracked automatically.</p>
    `,
    author: "SKED Team",
    authorRole: "Product",
    date: "2026-07-02",
    readTime: "4 min read",
    tags: ["guides", "packages"],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export const LATEST_POSTS = BLOG_POSTS.slice(0, 3);
