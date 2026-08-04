import { GlassCard } from "@/components/GlassCard";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="animate-fade-up space-y-4">
      <div>
        <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <GlassCard variant="strong" className="py-16 text-center">
        <p className="text-sm text-muted-foreground">
          This BundleMart module is ready for wiring — UI shell matches your reseller dashboard.
        </p>
      </GlassCard>
    </div>
  );
}
