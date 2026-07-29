import { Spinner } from "@/components/ui/spinner";

type AdminLoadingStateProps = {
  label?: string;
  variant?: "default" | "circle" | "pinwheel" | "circle-filled" | "ellipsis" | "ring" | "bars" | "infinite";
};

export function AdminLoadingState({ label = "Loading admin...", variant = "pinwheel" }: AdminLoadingStateProps) {
  return (
    <div className="admin-loading-state" role="status" aria-live="polite">
      <Spinner variant={variant} size={40} className="admin-loading-spinner" />
      <p>{label}</p>
    </div>
  );
}
