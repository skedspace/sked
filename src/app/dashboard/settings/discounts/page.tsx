import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DiscountList } from "./discount-list";

export default async function DiscountsPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", session.user.id)
    .single();

  if (!membership) redirect("/onboarding");

  const { data: discounts } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discount Codes</h1>
          <p className="text-muted-foreground">
            Create promo codes to offer discounts on bookings.
          </p>
        </div>
      </div>
      <DiscountList
        discounts={discounts ?? []}
        orgId={membership.org_id}
        isOwner={membership.role === "owner"}
      />
    </div>
  );
}
