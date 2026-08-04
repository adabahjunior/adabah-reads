import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

type BundleLoaderProps = {
  className?: string;
  label?: string;
  fullScreen?: boolean;
};

export function BundleLoader({ className, label = "Loading…", fullScreen = false }: BundleLoaderProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className="bm-loader" aria-hidden>
        <div className="bm-loader-ring" />
        <div className="bm-loader-ring bm-loader-ring-delay" />
        <div className="bm-loader-core gold-gradient-static">
          <Package className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
      {label ? (
        <p className="font-heading text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          {label}
        </p>
      ) : null}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  return content;
}
