import { Spinner } from "@/components/ui/spinner";

export default function CampaignsLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner variant="bars" size={32} className="text-[#c8a876]" />
        <p className="text-sm text-muted-foreground">Loading campaigns…</p>
      </div>
    </div>
  );
}
