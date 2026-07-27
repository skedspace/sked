import { redirect } from "next/navigation";
import { SessionControl } from "@/components/board/session-control";
import { getSession, getMembership } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SessionControlPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  return <SessionControl orgId={membership.org_id} />;
}
