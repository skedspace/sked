import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import { PickleballDashboardSkeleton } from "./pickleball-dashboard";
import { getSession, getMembership } from "@/lib/auth";

const PickleballDashboard = dynamicImport(
  () => import("./pickleball-dashboard").then((m) => m.PickleballDashboard),
  { loading: () => <PickleballDashboardSkeleton /> },
);

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  return <PickleballDashboard />;
}
