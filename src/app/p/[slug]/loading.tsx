import { Skeleton } from "@/components/ui/skeleton";

export default function PublicPageLoading() {
  return (
    <div className="min-h-screen bg-[#f7f6ef]">
      <div className="schedule-grid pointer-events-none fixed inset-0 -z-10 opacity-30" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <section className="mb-10">
          <Skeleton className="mb-6 h-44 w-full rounded-[20px] sm:h-56" />
          <div className="flex items-start gap-5">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full sm:h-20 sm:w-20" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-72" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Service cards */}
        <section className="mb-10">
          <div className="mb-5 flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-[16px] border border-black/[0.09] bg-white p-5">
                <Skeleton className="mb-2 h-5 w-28" />
                <Skeleton className="mb-1 h-7 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="mt-3 h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        {/* Date picker */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="mb-5 flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-[68px] rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
