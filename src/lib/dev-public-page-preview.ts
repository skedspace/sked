import type { PublicPageSections } from "@/lib/public-page";

type DevPublicPagePreview = {
  org_id: string;
  org_name: string;
  org_slug: string;
  bio: string | null;
  cover_url: string | null;
  logo_url: string | null;
  socials: Record<string, string | null>;
  sections: PublicPageSections;
  theme: string;
  is_published: boolean;
  plan: string;
  primary_color: string | null;
};

type DevPreviewGlobal = typeof globalThis & {
  __skedDevPublicPagePreviews?: Map<string, DevPublicPagePreview>;
};

function getStore() {
  const globalStore = globalThis as DevPreviewGlobal;
  globalStore.__skedDevPublicPagePreviews ??= new Map();
  return globalStore.__skedDevPublicPagePreviews;
}

export function setDevPublicPagePreview(preview: DevPublicPagePreview) {
  getStore().set(preview.org_slug, preview);
}

export function getDevPublicPagePreview(slug: string) {
  return getStore().get(slug) ?? null;
}
