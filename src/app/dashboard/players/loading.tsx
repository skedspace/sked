import { Spinner } from "@/components/ui/spinner";

export default function PlayersLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner variant="default" size={36} className="text-[#c8a876]" />
        <p className="text-sm text-muted-foreground">Loading players…</p>
      </div>
    </div>
  );
}
