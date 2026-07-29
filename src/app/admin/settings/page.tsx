import { redirect } from "next/navigation";

export default async function AdminSettingsPage() {
  redirect("/admin/pricing");
}
