import { redirect } from "next/navigation";
import { TournamentsView } from "./tournaments-view";
import { getSession, getMembership } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  return <TournamentsView />;
}
