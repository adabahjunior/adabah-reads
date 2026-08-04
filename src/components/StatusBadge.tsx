import { cn } from "@/lib/utils";

const statusStyles = {
  completed:
    "bg-[oklch(0.65_0.20_155/12%)] text-[oklch(0.72_0.19_155)] border-[oklch(0.65_0.20_155/20%)]",
  pending: "bg-gold-muted text-primary border-primary/20",
  processing: "bg-muted/80 text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusBadge({ status }: { status: keyof typeof statusStyles }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider capitalize",
        statusStyles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
