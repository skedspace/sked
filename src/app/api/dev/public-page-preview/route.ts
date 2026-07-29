import { NextResponse } from "next/server";
import { setDevPublicPagePreview } from "@/lib/dev-public-page-preview";
import { readPublicPageSections } from "@/lib/public-page";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const orgSlug = String(body.org_slug ?? "");
  const orgId = String(body.org_id ?? "");
  const orgName = String(body.org_name ?? "");

  if (!orgSlug || !orgId || !orgName) {
    return NextResponse.json(
      { error: "Missing preview identity" },
      { status: 400 },
    );
  }

  const sections = readPublicPageSections(body.sections, {
    bio: typeof body.bio === "string" ? body.bio : null,
    coverUrl: typeof body.cover_url === "string" ? body.cover_url : null,
    logoUrl: typeof body.logo_url === "string" ? body.logo_url : null,
  });

  setDevPublicPagePreview({
    org_id: orgId,
    org_name: orgName,
    org_slug: orgSlug,
    bio: typeof body.bio === "string" ? body.bio : null,
    cover_url: typeof body.cover_url === "string" ? body.cover_url : null,
    logo_url: typeof body.logo_url === "string" ? body.logo_url : null,
    socials:
      body.socials && typeof body.socials === "object"
        ? (body.socials as Record<string, string | null>)
        : {},
    sections,
    theme: String(body.theme ?? "default"),
    is_published: Boolean(body.is_published ?? true),
    plan: String(body.plan ?? "trial"),
    primary_color:
      typeof body.primary_color === "string" ? body.primary_color : null,
  });

  return NextResponse.json({ ok: true });
}
