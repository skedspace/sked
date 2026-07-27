import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404 page for the owner dashboard.
 * Shown when a dashboard route doesn't exist.
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div className="mb-3 text-3xl">🔍</div>
      <h2 className="mb-1 text-lg font-semibold">Page not found</h2>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        This dashboard page doesn&apos;t exist. It may have been moved or
        removed.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
