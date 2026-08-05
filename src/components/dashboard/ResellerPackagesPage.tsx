import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { cn, fmtGHS } from "@/lib/utils";

type PackageRow = {
  id: string;
  network: string;
  package_size: string;
  reseller_price: number;
  validity: string;
};

const NETWORKS = ["MTN", "Telecel", "AirtelTigo"] as const;

export function ResellerPackagesPage() {
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [filter, setFilter] = useState<(typeof NETWORKS)[number] | "All">("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase
      .from("packages")
      .select("id, network, package_size, reseller_price, validity")
      .eq("is_unavailable", false)
      .order("network")
      .order("reseller_price")
      .then(({ data }) => {
        setRows((data as PackageRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const visible = useMemo(
    () => (filter === "All" ? rows : rows.filter((r) => r.network === filter)),
    [rows, filter],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Data packages</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Prices set by BundleMart admin. Same price on Buy Data and the public API.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["All", ...NETWORKS] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setFilter(n)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
              filter === n
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <GlassCard variant="strong" className="py-10 text-center text-sm text-muted-foreground">
          No packages available yet.
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((row) => (
            <GlassCard key={row.id} variant="strong" className="space-y-2">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {row.network}
              </p>
              <p className="font-heading text-xl font-bold text-foreground">{row.package_size}</p>
              <p className="font-heading text-lg font-bold text-primary">
                {fmtGHS(Number(row.reseller_price))}
              </p>
              <p className="text-[11px] text-muted-foreground">{row.validity}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
