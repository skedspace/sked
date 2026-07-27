import { createClient } from "@/lib/supabase/server";
import { PublicPageContent } from "./embed-content";

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; service?: string }>;
}) {
  const { slug } = await params;
  const { date, service } = await searchParams;
  const supabase = createClient();

  const { data: pageData } = await supabase
    .rpc("get_public_page", { page_slug: slug })
    .maybeSingle();

  if (!pageData || !pageData.is_published) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-4 text-center text-sm text-muted-foreground">
        This business isn&apos;t currently accepting bookings.
      </div>
    );
  }

  return (
    <div className="p-3">
      <PublicPageContent
        slug={slug}
        orgId={pageData.org_id}
        services={pageData.services ?? []}
        initialDate={date ?? null}
        initialService={service ?? null}
      />
    </div>
  );
}
