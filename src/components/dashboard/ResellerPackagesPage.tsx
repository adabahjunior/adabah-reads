import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn, fmtGHS } from "@/lib/utils";

type AdminPkg = {
  id: string;
  network: string;
  package_size: string;
  reseller_price: number;
  public_price: number;
  validity: string;
};

type ResellerPkg = {
  network: string;
  package_size: string;
  base_price: number;
  profit: number;
  sell_price: number;
  is_active: boolean;
};

type Row = {
  key: string;
  network: string;
  package_size: string;
  base_price: number;
  public_price: number;
  validity: string;
  profit: string;
  active: boolean;
};

const NETWORKS = ["MTN", "Telecel", "AirtelTigo"] as const;

export function ResellerPackagesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<(typeof NETWORKS)[number] | "All">("All");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const reload = async () => {
    const [adminRes, mineRes] = await Promise.all([
      supabase
        .from("packages")
        .select("id, network, package_size, reseller_price, public_price, validity")
        .eq("is_unavailable", false)
        .order("network")
        .order("reseller_price"),
      supabase
        .from("reseller_packages")
        .select("network, package_size, base_price, profit, sell_price, is_active")
        .eq("is_active", true),
    ]);

    const mine = new Map(
      ((mineRes.data as ResellerPkg[]) ?? []).map((r) => [`${r.network}|${r.package_size}`, r]),
    );

    setRows(
      ((adminRes.data as AdminPkg[]) ?? []).map((p) => {
        const key = `${p.network}|${p.package_size}`;
        const custom = mine.get(key);
        return {
          key,
          network: p.network,
          package_size: p.package_size,
          base_price: Number(p.reseller_price),
          public_price: Number(p.public_price),
          validity: p.validity,
          profit: custom ? String(custom.profit) : "0",
          active: Boolean(custom?.is_active),
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const visible = useMemo(
    () => (filter === "All" ? rows : rows.filter((r) => r.network === filter)),
    [rows, filter],
  );

  const saveRow = async (row: Row) => {
    const profit = Number(row.profit);
    if (!Number.isFinite(profit) || profit < 0) {
      toast.error("Profit must be 0 or greater");
      return;
    }
    setBusyKey(row.key);
    try {
      const { error } = await supabase.rpc("upsert_reseller_package", {
        _network: row.network,
        _package_size: row.package_size,
        _profit: profit,
      });
      if (error) throw error;
      toast.success(`${row.network} ${row.package_size} saved for API`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusyKey(null);
    }
  };

  const removeRow = async (row: Row) => {
    setBusyKey(row.key);
    try {
      const { error } = await supabase.rpc("deactivate_reseller_package", {
        _network: row.network,
        _package_size: row.package_size,
      });
      if (error) throw error;
      toast.success("Removed from your API pricing");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusyKey(null);
    }
  };

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
          Admin base price is what you pay. Add your profit to set the sell price exposed on your API.
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

      <div className="space-y-3">
        {visible.length === 0 ? (
          <GlassCard variant="strong" className="py-10 text-center text-sm text-muted-foreground">
            No admin packages available yet.
          </GlassCard>
        ) : (
          visible.map((row) => {
            const profit = Number(row.profit) || 0;
            const sell = row.base_price + profit;
            return (
              <GlassCard key={row.key} variant="strong" className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-sm font-semibold text-foreground">
                      {row.network} · {row.package_size}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{row.validity}</p>
                    {row.active ? (
                      <span className="mt-1 inline-block text-[11px] font-semibold text-success">
                        On your API
                      </span>
                    ) : (
                      <span className="mt-1 inline-block text-[11px] text-muted-foreground">
                        Using base price until you save profit
                      </span>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-muted-foreground">Admin base</p>
                    <p className="font-heading text-lg font-bold text-foreground">
                      {fmtGHS(row.base_price)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <p className="mb-1 text-[11px] tracking-wider text-muted-foreground uppercase">
                      Your profit
                    </p>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.profit}
                      onChange={(e) =>
                        setRows((list) =>
                          list.map((r) =>
                            r.key === row.key ? { ...r, profit: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] tracking-wider text-muted-foreground uppercase">
                      API sell price
                    </p>
                    <p className="font-heading flex h-10 items-center text-lg font-bold text-primary">
                      {fmtGHS(sell)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] tracking-wider text-muted-foreground uppercase">
                      Admin retail
                    </p>
                    <p className="flex h-10 items-center text-sm text-muted-foreground">
                      {fmtGHS(row.public_price)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <Button
                      size="sm"
                      variant="hero"
                      disabled={busyKey === row.key}
                      onClick={() => void saveRow(row)}
                    >
                      {busyKey === row.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </Button>
                    {row.active ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyKey === row.key}
                        onClick={() => void removeRow(row)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}
