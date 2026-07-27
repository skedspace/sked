import { Spinner } from "@/components/ui/spinner";

export default function SessionLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner variant="circle" size={36} className="text-[#c8a876]" />
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </div>
    </div>
  );
}
