import { Spinner } from "@/components/ui/spinner";

export default function ReviewsLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner variant="ring" size={40} className="text-[#c8a876]" />
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      </div>
    </div>
  );
}
