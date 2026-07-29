"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck2,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  Globe2,
  HelpCircle,
  Image,
  Info,
  LayoutPanelTop,
  Mail,
  Megaphone,
  MoreHorizontal,
  Palette,
  Plus,
  Send,
  Share2,
  Star,
  Store,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PUBLIC_PAGE_THEMES,
  readPublicPageSections,
  type FaqItem,
  type PublicPageSections,
} from "@/lib/public-page";
import { PagePreview } from "./page-preview";

type Page = {
  theme: string;
  sections: unknown;
  cover_url: string | null;
  logo_url: string | null;
  bio: string | null;
  socials: Record<string, string | null> | null;
  is_published: boolean;
  primary_color: string | null;
} | null;

type WorkspaceView = "storefront" | "booking";
type StorefrontSectionId = keyof PublicPageSections["storefront"];
type BookingSectionId = keyof PublicPageSections["booking"];

const THEMES = PUBLIC_PAGE_THEMES;

const STOREFRONT_ITEMS: Array<{
  id: StorefrontSectionId;
  label: string;
  detail: string;
  icon: typeof Store;
}> = [
  {
    id: "hero",
    label: "Hero Section",
    detail: "Headline, CTA, logo and cover photo",
    icon: Store,
  },
  {
    id: "about",
    label: "About Us",
    detail: "Intro copy and business story",
    icon: Info,
  },
  {
    id: "amenities",
    label: "Amenities",
    detail: "Benefits and venue highlights",
    icon: Star,
  },
  {
    id: "courts",
    label: "Courts",
    detail: "Court showcase title and visibility",
    icon: LayoutPanelTop,
  },
  {
    id: "gallery",
    label: "Gallery",
    detail: "Photo URLs for venue imagery",
    icon: Image,
  },
  {
    id: "promo",
    label: "Promo Banner",
    detail: "Special offer or announcement block",
    icon: Megaphone,
  },
  {
    id: "testimonials",
    label: "Testimonials",
    detail: "Customer quotes and social proof",
    icon: UsersRound,
  },
  {
    id: "faq",
    label: "FAQ",
    detail: "Common booking questions",
    icon: HelpCircle,
  },
  {
    id: "contact",
    label: "Contact",
    detail: "Location, hours, phone and email",
    icon: Mail,
  },
];

const BOOKING_ITEMS: Array<{
  id: BookingSectionId;
  label: string;
  detail: string;
  icon: typeof Store;
}> = [
  {
    id: "service",
    label: "Service Selection",
    detail: "Service step title and helper copy",
    icon: LayoutPanelTop,
  },
  {
    id: "dateTime",
    label: "Date & Time",
    detail: "Availability picker copy and defaults",
    icon: CalendarCheck2,
  },
  {
    id: "customer",
    label: "Customer Details",
    detail: "Customer form labels and helper text",
    icon: UsersRound,
  },
  {
    id: "payment",
    label: "Payment",
    detail: "Payment step copy and deposit messaging",
    icon: Globe2,
  },
  {
    id: "policy",
    label: "Policies",
    detail: "Cancellation, arrival and venue notes",
    icon: Info,
  },
  {
    id: "confirmation",
    label: "Confirmation",
    detail: "Success message after booking",
    icon: Check,
  },
];

function mergeSections(value: unknown, page: Page): PublicPageSections {
  return readPublicPageSections(value, {
    bio: page?.bio,
    coverUrl: page?.cover_url,
    logoUrl: page?.logo_url,
  });
}

export function PageEditor({
  orgId,
  page,
  slug,
  orgName,
  orgLogoUrl,
}: {
  orgId: string;
  page: Page;
  slug: string;
  orgName: string;
  orgLogoUrl: string | null;
}) {
  const socials = page?.socials ?? {};
  const initialSections = useMemo(
    () => {
      const merged = mergeSections(page?.sections, page);
      return {
        ...merged,
        storefront: {
          ...merged.storefront,
          hero: {
            ...merged.storefront.hero,
            brandName: merged.storefront.hero.brandName || orgName,
            logoUrl: merged.storefront.hero.logoUrl || orgLogoUrl || "",
          },
        },
      };
    },
    [orgLogoUrl, orgName, page],
  );
  const [sections, setSections] = useState<PublicPageSections>(initialSections);
  const [facebook, setFacebook] = useState(socials.facebook ?? "");
  const [instagram, setInstagram] = useState(socials.instagram ?? "");
  const [website, setWebsite] = useState(socials.website ?? "");
  const [theme, setTheme] = useState(page?.theme ?? "default");
  const [primaryColor, setPrimaryColor] = useState(
    page?.primary_color ?? THEMES[0]!.colors[0]!,
  );
  const [isPublished, setIsPublished] = useState(page?.is_published ?? false);
  const [customSlug, setCustomSlug] = useState(slug);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"content" | "design">("content");
  const [workspaceView, setWorkspaceView] =
    useState<WorkspaceView>("storefront");
  const [showSectionLibrary, setShowSectionLibrary] = useState(false);
  const [activeStorefront, setActiveStorefront] =
    useState<StorefrontSectionId>("hero");
  const [activeBooking, setActiveBooking] =
    useState<BookingSectionId>("service");
  const router = useRouter();
  const supabase = createClient();
  const db = supabase as any;

  const activeTheme =
    THEMES.find((option) => option.id === theme) ?? THEMES[0]!;
  const inkColor = activeTheme.colors[1]!;
  const paperColor = activeTheme.colors[2]!;
  const mutedColor = activeTheme.colors[3]!;
  const previewSlug = customSlug || slug;
  const displaySlug = previewSlug || "your-business";
  const publicUrl = useMemo(
    () =>
      previewSlug
        ? `/p/${encodeURIComponent(previewSlug)}?preview=1`
        : "/dashboard/settings/page",
    [previewSlug],
  );

  const activeLabel =
    workspaceView === "storefront"
      ? STOREFRONT_ITEMS.find((item) => item.id === activeStorefront)?.label
      : BOOKING_ITEMS.find((item) => item.id === activeBooking)?.label;

  async function handleSave(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const payload: Record<string, unknown> = {
        bio: sections.storefront.hero.subheadline || null,
        cover_url: sections.storefront.hero.coverUrl || null,
        logo_url: sections.storefront.hero.logoUrl || null,
        socials: {
          facebook: facebook || null,
          instagram: instagram || null,
          website: website || null,
        },
        sections,
        theme,
      };

      // Only include primary_color if the column exists
      try {
        await db.from("pages").select("primary_color").eq("org_id", orgId).limit(1);
        payload.primary_color = primaryColor;
      } catch {
        // Column doesn't exist yet — skip it
      }

      const { error } = await db
        .from("pages")
        .update(payload)
        .eq("org_id", orgId);

      if (!error && customSlug !== slug) {
        await db
          .from("organizations")
          .update({
            slug: customSlug,
            name: sections.storefront.hero.brandName || orgName,
            logo_url: sections.storefront.hero.logoUrl || null,
          })
          .eq("id", orgId);
      } else if (!error) {
        await db
          .from("organizations")
          .update({
            name: sections.storefront.hero.brandName || orgName,
            logo_url: sections.storefront.hero.logoUrl || null,
          })
          .eq("id", orgId);
      }

      setSaving(false);
      if (error) {
        setSaveError(error.message);
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        await fetch("/api/dev/public-page-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            org_id: orgId,
            org_name: sections.storefront.hero.brandName || orgName,
            org_slug: customSlug || slug,
            is_published: isPublished,
            primary_color: primaryColor,
            plan: "trial",
          }),
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (err) {
      setSaving(false);
      setSaveError(
        err instanceof TypeError
          ? "Network error — check your connection and ensure the Supabase server is running."
          : (err as Error).message ?? "An unexpected error occurred.",
      );
    }
  }

  async function togglePublish() {
    const newState = !isPublished;
    setIsPublished(newState);

    await db
      .from("pages")
      .update({ is_published: newState })
      .eq("org_id", orgId);

    router.refresh();
  }

  async function checkSlug() {
    setCheckingSlug(true);
    setSlugAvailable(null);
    const { data } = await db
      .from("organizations")
      .select("id")
      .eq("slug", customSlug)
      .neq("id", orgId)
      .maybeSingle();
    setSlugAvailable(!data);
    setCheckingSlug(false);
  }

  function updateStorefront<K extends StorefrontSectionId>(
    id: K,
    patch: Partial<PublicPageSections["storefront"][K]>,
  ) {
    setSections((current) => ({
      ...current,
      storefront: {
        ...current.storefront,
        [id]: { ...current.storefront[id], ...patch },
      },
    }));
  }

  function updateBooking<K extends BookingSectionId>(
    id: K,
    patch: Partial<PublicPageSections["booking"][K]>,
  ) {
    setSections((current) => ({
      ...current,
      booking: {
        ...current.booking,
        [id]: { ...current.booking[id], ...patch },
      },
    }));
  }

  function addStorefrontSection(id: StorefrontSectionId) {
    updateStorefront(id, { enabled: true } as never);
    setActiveStorefront(id);
    setWorkspaceView("storefront");
    setShowSectionLibrary(false);
  }

  function addBookingSection(id: BookingSectionId) {
    updateBooking(id, { enabled: true } as never);
    setActiveBooking(id);
    setWorkspaceView("booking");
    setShowSectionLibrary(false);
  }

  const hiddenStorefrontItems = STOREFRONT_ITEMS.filter(
    (item) => !sections.storefront[item.id].enabled,
  );
  const hiddenBookingItems = BOOKING_ITEMS.filter(
    (item) => !sections.booking[item.id].enabled,
  );
  const hiddenItems =
    workspaceView === "storefront" ? hiddenStorefrontItems : hiddenBookingItems;

  return (
    <form className="space-y-5" onSubmit={handleSave}>
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#080a07]">
            Public Page
          </h1>
          <p className="mt-1 text-sm font-medium text-[#5e635b]">
            Design your one page storefront and booking experience.
          </p>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex max-w-full items-center gap-2 truncate text-sm font-bold text-[#57940e] hover:text-[#326d1e]"
          >
            <span className="truncate">{displaySlug}.sked.space</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-[#4d5549]">
            <Check className="h-3.5 w-3.5 rounded-full bg-[#eff9d8] p-0.5 text-[#5d9e12]" />
            {saving
              ? "Saving changes"
              : saved
                ? "Changes saved"
                : "All changes saved"}
          </span>
          <Button variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <Eye />
              Preview
            </a>
          </Button>
          <Button
            type="button"
            onClick={togglePublish}
            className={
              isPublished
                ? "bg-[#171a16] text-white hover:bg-[#2b3028]"
                : "bg-[#64b80f] text-white hover:bg-[#579f0e]"
            }
          >
            <Send />
            {isPublished ? "Unpublish" : "Publish"}
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" type="button" aria-label="More">
            <MoreHorizontal />
          </Button>
          <Button type="submit" disabled={saving}>
            {saved ? "Saved" : saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-xl border border-black/[0.08] bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("content")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-black transition-colors ${
            tab === "content"
              ? "bg-[#f0f9d9] text-[#172112]"
              : "text-[#585e54] hover:bg-[#fbfcf6]"
          }`}
        >
          Content
        </button>
        <button
          type="button"
          onClick={() => setTab("design")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-black transition-colors ${
            tab === "design"
              ? "bg-[#f0f9d9] text-[#172112]"
              : "text-[#585e54] hover:bg-[#fbfcf6]"
          }`}
        >
          Page Design
        </button>
      </div>

      {tab === "content" ? (
        <div className="grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
              <ModeButton
                active={workspaceView === "storefront"}
                icon={<Store />}
                label="Storefront"
                onClick={() => setWorkspaceView("storefront")}
              />
              <ModeButton
                active={workspaceView === "booking"}
                icon={<CalendarCheck2 />}
                label="Booking Flow"
                onClick={() => setWorkspaceView("booking")}
              />
            </div>

            <p className="text-sm font-medium text-[#4f554d]">
              {workspaceView === "storefront"
                ? "Edit the content, media and sections customers see before booking."
                : "Edit the steps customers see while making a booking."}
            </p>

            <section className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.04)]">
              <div className="border-b border-black/[0.06] p-5">
                <h2 className="text-sm font-black text-[#11140f]">
                  {workspaceView === "storefront"
                    ? "Storefront Sections"
                    : "Booking Sections"}
                </h2>
                <p className="mt-1 text-xs font-medium text-[#646961]">
                  {workspaceView === "storefront"
                    ? "Choose a section, then edit its content below."
                    : "Configure the booking flow copy and visible steps."}
                </p>
              </div>
              <div>
                {workspaceView === "storefront"
                  ? STOREFRONT_ITEMS.map((item) => {
                      const enabled = sections.storefront[item.id].enabled;
                      return (
                        <SectionRow
                          key={item.id}
                          active={activeStorefront === item.id}
                          enabled={enabled}
                          label={item.label}
                          detail={item.detail}
                          icon={item.icon}
                          onOpen={() => setActiveStorefront(item.id)}
                          onToggle={() =>
                            updateStorefront(item.id, { enabled: !enabled })
                          }
                        />
                      );
                    })
                  : BOOKING_ITEMS.map((item) => {
                      const enabled = sections.booking[item.id].enabled;
                      return (
                        <SectionRow
                          key={item.id}
                          active={activeBooking === item.id}
                          enabled={enabled}
                          label={item.label}
                          detail={item.detail}
                          icon={item.icon}
                          onOpen={() => setActiveBooking(item.id)}
                          onToggle={() =>
                            updateBooking(item.id, { enabled: !enabled })
                          }
                        />
                      );
                    })}
              </div>
            </section>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full bg-white"
              onClick={() => setShowSectionLibrary((open) => !open)}
              aria-expanded={showSectionLibrary}
            >
              <Plus />
              Add Section
            </Button>

            {showSectionLibrary && (
              <section className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.04)]">
                <div className="border-b border-black/[0.06] p-5">
                  <h2 className="text-sm font-black text-[#11140f]">
                    Section Library
                  </h2>
                  <p className="mt-1 text-xs font-medium text-[#646961]">
                    Add hidden sections back to this public page.
                  </p>
                </div>
                {hiddenItems.length > 0 ? (
                  <div className="divide-y divide-black/[0.06]">
                    {hiddenItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            workspaceView === "storefront"
                              ? addStorefrontSection(
                                  item.id as StorefrontSectionId,
                                )
                              : addBookingSection(item.id as BookingSectionId)
                          }
                          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[#fbfcf6]"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0f8dd] text-[#407b12]">
                            <Icon className="h-5 w-5" strokeWidth={1.8} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black text-[#141713]">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-xs font-medium text-[#646961]">
                              {item.detail}
                            </span>
                          </span>
                          <Plus className="h-4 w-4 text-[#57940e]" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="p-5 text-sm font-medium text-[#646961]">
                    Every {workspaceView === "storefront" ? "storefront" : "booking"} section is already on the page.
                  </p>
                )}
              </section>
            )}

            <section className="space-y-5 rounded-xl border border-black/[0.08] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.04)]">
              <div>
                <h2 className="text-sm font-black text-[#11140f]">
                  Edit {activeLabel}
                </h2>
                <p className="mt-1 text-xs font-medium text-[#646961]">
                  Changes update the live preview immediately and are saved to the
                  public page.
                </p>
              </div>

              {workspaceView === "storefront" ? (
                <StorefrontEditor
                  active={activeStorefront}
                  sections={sections}
                  update={updateStorefront}
                />
              ) : (
                <BookingEditor
                  active={activeBooking}
                  sections={sections}
                  update={updateBooking}
                />
              )}
            </section>

            {saveError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {saveError}
              </p>
            )}
          </aside>

          <section className="min-w-0 self-start rounded-xl border border-black/[0.08] bg-white p-4 shadow-[0_12px_36px_rgba(23,26,22,0.05)] lg:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="inline-flex items-center gap-3 text-base font-black text-[#11140f]">
                <span className="h-3 w-3 rounded-full bg-[#75c51b]" />
                Live Preview
              </h2>
              <span className="hidden items-center gap-2 rounded-full bg-[#f0f8dd] px-3 py-1 text-xs font-black text-[#477914] sm:inline-flex">
                <Palette className="h-3.5 w-3.5" />
                {activeTheme.label}
              </span>
            </div>
            <PagePreview
              orgName={sections.storefront.hero.brandName || orgName}
              facebook={facebook}
              instagram={instagram}
              website={website}
              theme={theme}
              primaryColor={primaryColor}
              inkColor={inkColor}
              paperColor={paperColor}
              mutedColor={mutedColor}
              coverUrl={sections.storefront.hero.coverUrl}
              logoUrl={sections.storefront.hero.logoUrl}
              slug={slug}
              orgId={orgId}
              view={workspaceView}
              sections={sections}
            />
          </section>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
          <aside className="space-y-5">
            {/* Page Status */}
            <section className="rounded-xl border border-black/[0.08] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.04)]">
              <h2 className="text-sm font-black text-[#11140f]">Page Status</h2>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-black/[0.07] bg-[#fbfaf7] p-3">
                <div>
                  <p className="text-sm font-black text-[#171a16]">
                    {isPublished ? "Published" : "Unpublished"}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#626860]">
                    {isPublished
                      ? "Visible to visitors and bookings."
                      : "Hidden from the public until published."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={togglePublish}
                  aria-label="Toggle page publishing"
                  className={`relative h-7 w-12 rounded-full overflow-hidden transition-colors ${
                    isPublished ? "bg-[#75c51b]" : "bg-[#d9ddd2]"
                  }`}
                >
                  <span
                    className={`absolute top-[4px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      isPublished ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* Design Settings */}
            <section className="space-y-5 rounded-xl border border-black/[0.08] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.04)]">
              <div>
                <h2 className="text-sm font-black text-[#11140f]">
                  Design Settings
                </h2>
                <p className="mt-1 text-xs font-medium text-[#646961]">
                  Customize the look and feel.
                </p>
              </div>

              <FieldSelect
                id="theme"
                label="Theme"
                value={theme}
                onChange={(value) => {
                  setTheme(value);
                  const picked = THEMES.find((t) => t.id === value);
                  if (picked) setPrimaryColor(picked.colors[0]!);
                }}
                options={THEMES.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
              />
              <p className="text-xs font-medium text-[#646961]">
                {activeTheme.description}
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-black text-[#171a16]">
                    Theme Colors
                  </span>
                  <div className="flex items-center gap-3">
                    {activeTheme.colors.map((color) => (
                      <span
                        key={color}
                        className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-black text-[#171a16]">
                    Primary Color
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-md border border-black/10 bg-transparent"
                      aria-label="Pick primary color"
                    />
                    <span className="text-xs font-bold text-[#656a61]">
                      {primaryColor.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Page Link */}
            <section className="space-y-4 rounded-xl border border-black/[0.08] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.04)]">
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-[#57940e]" />
                <h2 className="text-sm font-black text-[#11140f]">Page Link</h2>
              </div>
              <div className="space-y-2">
                <Label htmlFor="page-slug" className="text-xs font-black">
                  Custom page link
                </Label>
                <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#fbfaf7] pl-3 text-sm">
                  <Input
                    id="page-slug"
                    value={customSlug}
                    onChange={(event) => {
                      setCustomSlug(
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "")
                          .replace(/-+/g, "-"),
                      );
                      setSlugAvailable(null);
                    }}
                    className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    placeholder="your-business"
                  />
                  <span className="shrink-0 pr-3 text-xs font-bold text-[#656a61]">
                    .sked.space
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white"
                  disabled={!customSlug || customSlug === slug || checkingSlug}
                  onClick={checkSlug}
                >
                  {checkingSlug ? "Checking..." : "Check availability"}
                </Button>
                {slugAvailable === true && (
                  <p className="text-xs font-bold text-emerald-600">
                    This link is available.
                  </p>
                )}
                {slugAvailable === false && (
                  <p className="text-xs font-bold text-red-600">
                    This link is already taken.
                  </p>
                )}
              </div>
            </section>

            {/* Page Branding */}
            <section className="space-y-4 rounded-xl border border-black/[0.08] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.04)]">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-[#57940e]" />
                <h2 className="text-sm font-black text-[#11140f]">
                  Page Branding
                </h2>
              </div>
              <p className="text-xs font-medium text-[#646961]">
                Controls the logo, venue name and small label shown in the public page header.
              </p>
              <PageBrandingEditor
                hero={sections.storefront.hero}
                update={(patch) => updateStorefront("hero", patch)}
              />
            </section>

            {/* Social Links */}
            <section className="space-y-4 rounded-xl border border-black/[0.08] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.04)]">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-[#57940e]" />
                <h2 className="text-sm font-black text-[#11140f]">
                  Social Links
                </h2>
              </div>
              <FieldInput
                label="Facebook URL"
                value={facebook}
                onChange={setFacebook}
                placeholder="https://facebook.com/yourpage"
              />
              <FieldInput
                label="Instagram URL"
                value={instagram}
                onChange={setInstagram}
                placeholder="https://instagram.com/yourpage"
              />
              <FieldInput
                label="Website URL"
                value={website}
                onChange={setWebsite}
                placeholder="https://yourwebsite.com"
              />
            </section>

            {saveError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {saveError}
              </p>
            )}
          </aside>

          <section className="min-w-0 self-start rounded-xl border border-black/[0.08] bg-white p-4 shadow-[0_12px_36px_rgba(23,26,22,0.05)] lg:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="inline-flex items-center gap-3 text-base font-black text-[#11140f]">
                <span className="h-3 w-3 rounded-full bg-[#75c51b]" />
                Live Preview
              </h2>
              <span className="hidden items-center gap-2 rounded-full bg-[#f0f8dd] px-3 py-1 text-xs font-black text-[#477914] sm:inline-flex">
                <Palette className="h-3.5 w-3.5" />
                {activeTheme.label}
              </span>
            </div>
            <PagePreview
              orgName={sections.storefront.hero.brandName || orgName}
              facebook={facebook}
              instagram={instagram}
              website={website}
              theme={theme}
              primaryColor={primaryColor}
              inkColor={inkColor}
              paperColor={paperColor}
              mutedColor={mutedColor}
              coverUrl={sections.storefront.hero.coverUrl}
              logoUrl={sections.storefront.hero.logoUrl}
              slug={slug}
              orgId={orgId}
              view={workspaceView}
              sections={sections}
            />
          </section>
        </div>
      )}
    </form>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 items-center justify-center gap-2 border-r border-black/[0.06] text-sm font-black transition-colors last:border-r-0 ${
        active
          ? "bg-[#f0f9d9] text-[#172112]"
          : "text-[#585e54] hover:bg-[#fbfcf6]"
      }`}
    >
      <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      {label}
    </button>
  );
}

function SectionRow({
  active,
  enabled,
  label,
  detail,
  icon: Icon,
  onOpen,
  onToggle,
}: {
  active: boolean;
  enabled: boolean;
  label: string;
  detail: string;
  icon: typeof Store;
  onOpen: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-black/[0.06] px-4 py-3.5 last:border-b-0 ${
        active ? "bg-[#fbfcf6]" : ""
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
            enabled
              ? "bg-[#f0f8dd] text-[#407b12]"
              : "bg-[#f0f0ee] text-[#8c9185]"
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-[#141713]">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-xs font-medium text-[#646961]">
            {enabled ? detail : "Hidden from page"}
          </span>
        </span>
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        aria-label={`${enabled ? "Hide" : "Show"} ${label}`}
        className={`flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors ${
          enabled ? "bg-[#b9f34b]" : "bg-[#d6d7d2]"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function PageBrandingEditor({
  hero,
  update,
}: {
  hero: PublicPageSections["storefront"]["hero"];
  update: (patch: Partial<PublicPageSections["storefront"]["hero"]>) => void;
}) {
  return (
    <div className="space-y-4">
      <FieldInput
        label="Public page name"
        value={hero.brandName}
        onChange={(brandName) => update({ brandName })}
        placeholder="Marco's Pickleball Courts"
      />
      <FieldInput
        label="Small label"
        value={hero.publicLabel}
        onChange={(publicLabel) => update({ publicLabel })}
        placeholder="Public bookings"
      />
      <FieldInput
        label="Logo URL"
        value={hero.logoUrl}
        onChange={(logoUrl) => update({ logoUrl })}
        placeholder="https://..."
      />
    </div>
  );
}

function StorefrontEditor({
  active,
  sections,
  update,
}: {
  active: StorefrontSectionId;
  sections: PublicPageSections;
  update: <K extends StorefrontSectionId>(
    id: K,
    patch: Partial<PublicPageSections["storefront"][K]>,
  ) => void;
}) {
  const data = sections.storefront[active];

  if (active === "hero") {
    const hero = sections.storefront.hero;
    return (
      <div className="space-y-4">
        <EnabledField
          enabled={hero.enabled}
          onChange={(enabled) => update("hero", { enabled })}
        />
        <FieldInput
          label="Headline"
          value={hero.headline}
          onChange={(headline) => update("hero", { headline })}
          placeholder="Play More. Connect Better."
        />
        <FieldTextarea
          label="Subheadline"
          value={hero.subheadline}
          onChange={(subheadline) => update("hero", { subheadline })}
          placeholder="Describe why customers should book with you."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput
            label="Primary CTA"
            value={hero.primaryCta}
            onChange={(primaryCta) => update("hero", { primaryCta })}
            placeholder="Book a Court"
          />
          <FieldInput
            label="Secondary CTA"
            value={hero.secondaryCta}
            onChange={(secondaryCta) => update("hero", { secondaryCta })}
            placeholder="View Courts"
          />
        </div>
        <FieldInput
          label="Cover photo URL"
          value={hero.coverUrl}
          onChange={(coverUrl) => update("hero", { coverUrl })}
          placeholder="https://..."
        />
      </div>
    );
  }

  if (active === "amenities") {
    const amenities = sections.storefront.amenities;
    return (
      <div className="space-y-4">
        <EnabledField
          enabled={amenities.enabled}
          onChange={(enabled) => update("amenities", { enabled })}
        />
        <FieldInput
          label="Section title"
          value={amenities.title}
          onChange={(title) => update("amenities", { title })}
          placeholder="Why players choose us"
        />
        <StringListEditor
          label="Amenities"
          values={amenities.items}
          placeholder="Add an amenity"
          onChange={(items) => update("amenities", { items })}
        />
      </div>
    );
  }

  if (active === "gallery") {
    const gallery = sections.storefront.gallery;
    return (
      <div className="space-y-4">
        <EnabledField
          enabled={gallery.enabled}
          onChange={(enabled) => update("gallery", { enabled })}
        />
        <FieldInput
          label="Section title"
          value={gallery.title}
          onChange={(title) => update("gallery", { title })}
          placeholder="Gallery"
        />
        <StringListEditor
          label="Photo URLs"
          values={gallery.photos}
          placeholder="https://..."
          onChange={(photos) => update("gallery", { photos })}
        />
      </div>
    );
  }

  if (active === "testimonials") {
    const testimonials = sections.storefront.testimonials;
    return (
      <div className="space-y-4">
        <EnabledField
          enabled={testimonials.enabled}
          onChange={(enabled) => update("testimonials", { enabled })}
        />
        <FieldInput
          label="Section title"
          value={testimonials.title}
          onChange={(title) => update("testimonials", { title })}
          placeholder="Player Stories"
        />
        <StringListEditor
          label="Quotes"
          values={testimonials.quotes}
          placeholder="Add a customer quote"
          onChange={(quotes) => update("testimonials", { quotes })}
        />
      </div>
    );
  }

  if (active === "promo") {
    const promo = sections.storefront.promo;
    return (
      <div className="space-y-4">
        <EnabledField
          enabled={promo.enabled}
          onChange={(enabled) => update("promo", { enabled })}
        />
        <FieldInput
          label="Eyebrow"
          value={promo.eyebrow}
          onChange={(eyebrow) => update("promo", { eyebrow })}
          placeholder="New player offer"
        />
        <FieldInput
          label="Headline"
          value={promo.title}
          onChange={(title) => update("promo", { title })}
          placeholder="Bring your crew and save"
        />
        <FieldTextarea
          label="Body copy"
          value={promo.body}
          onChange={(body) => update("promo", { body })}
          placeholder="Add offer details or a seasonal announcement."
        />
        <FieldInput
          label="CTA label"
          value={promo.ctaLabel}
          onChange={(ctaLabel) => update("promo", { ctaLabel })}
          placeholder="Claim offer"
        />
      </div>
    );
  }

  if (active === "faq") {
    const faq = sections.storefront.faq;
    return (
      <div className="space-y-4">
        <EnabledField
          enabled={faq.enabled}
          onChange={(enabled) => update("faq", { enabled })}
        />
        <FieldInput
          label="Section title"
          value={faq.title}
          onChange={(title) => update("faq", { title })}
          placeholder="Questions before you book?"
        />
        <FaqListEditor
          values={faq.items}
          onChange={(items) => update("faq", { items })}
        />
      </div>
    );
  }

  if (active === "contact") {
    const contact = sections.storefront.contact;
    return (
      <div className="space-y-4">
        <EnabledField
          enabled={contact.enabled}
          onChange={(enabled) => update("contact", { enabled })}
        />
        <FieldInput
          label="Street address"
          value={contact.address}
          onChange={(address) => update("contact", { address })}
          placeholder="123 Pickleball Lane"
        />
        <FieldInput
          label="City"
          value={contact.city}
          onChange={(city) => update("contact", { city })}
          placeholder="Makati City, PH"
        />
        <FieldInput
          label="Hours"
          value={contact.hours}
          onChange={(hours) => update("contact", { hours })}
          placeholder="Open Daily, 6:00 AM - 11:00 PM"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput
            label="Phone"
            value={contact.phone}
            onChange={(phone) => update("contact", { phone })}
            placeholder="+63 912 345 6789"
          />
          <FieldInput
            label="Email"
            value={contact.email}
            onChange={(email) => update("contact", { email })}
            placeholder="hello@example.com"
          />
        </div>
      </div>
    );
  }

  const section = data as {
    enabled: boolean;
    title: string;
    body?: string;
    intro?: string;
  };
  return (
    <div className="space-y-4">
      <EnabledField
        enabled={section.enabled}
        onChange={(enabled) => update(active, { enabled } as never)}
      />
      <FieldInput
        label="Section title"
        value={section.title}
        onChange={(title) => update(active, { title } as never)}
        placeholder="Section title"
      />
      <FieldTextarea
        label={active === "courts" ? "Intro copy" : "Body copy"}
        value={section.body ?? section.intro ?? ""}
        onChange={(value) =>
          update(
            active,
            active === "courts"
              ? ({ intro: value } as never)
              : ({ body: value } as never),
          )
        }
        placeholder="Add section copy"
      />
    </div>
  );
}

function FaqListEditor({
  values,
  onChange,
}: {
  values: FaqItem[];
  onChange: (values: FaqItem[]) => void;
}) {
  const normalized = values.length
    ? values
    : [{ question: "", answer: "" }];

  return (
    <div className="space-y-2">
      <Label className="text-xs font-black">Questions</Label>
      <div className="space-y-3">
        {normalized.map((item, index) => (
          <div
            key={index}
            className="space-y-2 rounded-xl border border-black/[0.08] bg-[#fbfaf7] p-3"
          >
            <Input
              value={item.question}
              placeholder="Question"
              className="h-10 rounded-lg border-black/[0.08] bg-white"
              onChange={(event) => {
                const next = [...normalized];
                next[index] = { ...item, question: event.target.value };
                onChange(
                  next.filter(
                    (entry) =>
                      entry.question.trim() ||
                      entry.answer.trim() ||
                      next.length === 1,
                  ),
                );
              }}
            />
            <textarea
              className="focus-visible:ring-ring/40 min-h-20 w-full resize-none rounded-lg border border-black/[0.08] bg-white px-3.5 py-3 text-sm outline-none focus-visible:ring-2"
              value={item.answer}
              onChange={(event) => {
                const next = [...normalized];
                next[index] = { ...item, answer: event.target.value };
                onChange(
                  next.filter(
                    (entry) =>
                      entry.question.trim() ||
                      entry.answer.trim() ||
                      next.length === 1,
                  ),
                );
              }}
              placeholder="Answer"
              rows={3}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bg-white"
        onClick={() => onChange([...values, { question: "", answer: "" }])}
      >
        <Plus />
        Add question
      </Button>
    </div>
  );
}

function BookingEditor({
  active,
  sections,
  update,
}: {
  active: BookingSectionId;
  sections: PublicPageSections;
  update: <K extends BookingSectionId>(
    id: K,
    patch: Partial<PublicPageSections["booking"][K]>,
  ) => void;
}) {
  const section = sections.booking[active];

  return (
    <div className="space-y-4">
      <EnabledField
        enabled={section.enabled}
        onChange={(enabled) => update(active, { enabled } as never)}
      />
      <FieldInput
        label="Step title"
        value={section.title}
        onChange={(title) => update(active, { title } as never)}
        placeholder="Step title"
      />
      <FieldTextarea
        label="Helper text"
        value={section.helper}
        onChange={(helper) => update(active, { helper } as never)}
        placeholder="Explain what happens in this booking step."
      />
    </div>
  );
}

function EnabledField({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-black/[0.08] bg-[#fbfaf7] p-3">
      <span>
        <span className="block text-sm font-black text-[#171a16]">
          Show on public page
        </span>
        <span className="mt-0.5 block text-xs font-medium text-[#646961]">
          Hidden sections are removed from the preview and saved page.
        </span>
      </span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-[#75c51b]"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function StringListEditor({
  label,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const normalized = values.length ? values : [""];

  return (
    <div className="space-y-2">
      <Label className="text-xs font-black">{label}</Label>
      <div className="space-y-2">
        {normalized.map((value, index) => (
          <Input
            key={index}
            value={value}
            placeholder={placeholder}
            className="h-11 rounded-xl border-black/[0.08] bg-[#fbfaf7]"
            onChange={(event) => {
              const next = [...normalized];
              next[index] = event.target.value;
              onChange(next.filter((item) => item.trim() || next.length === 1));
            }}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bg-white"
        onClick={() => onChange([...values, ""])}
      >
        <Plus />
        Add item
      </Button>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-black">{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border-black/[0.08] bg-[#fbfaf7]"
      />
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-black">{label}</Label>
      <textarea
        id={id}
        className="focus-visible:ring-ring/40 min-h-28 w-full resize-none rounded-xl border border-black/[0.08] bg-[#fbfaf7] px-3.5 py-3 text-sm outline-none focus-visible:ring-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
      />
    </div>
  );
}

function FieldSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-black">
        {label}
      </Label>
      <label className="relative block">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] bg-[#fbfaf7] px-3.5 pr-10 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#81c81b]/40"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#626860]" />
      </label>
    </div>
  );
}
