import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn, fmtGHS } from "@/lib/utils";

type PackageRow = {
  id: string;
  network: string;
  package_size: string;
  public_price: number;
  reseller_price: number;
  is_unavailable: boolean;
  validity: string;
};

const NETWORKS = ["MTN", "Telecel", "AirtelTigo"] as const;

export function AdminPackagesPage() {
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    network: "MTN",
    package_size: "",
    public_price: "",
    reseller_price: "",
    validity: "No Expiry",
  });

  const reload = async () => {
    const { data } = await supabase
      .from("packages")
      .select("*")
      .order("network", { ascending: true })
      .order("reseller_price", { ascending: true });
    setRows((data as PackageRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const savePrices = async (pkg: PackageRow) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("packages")
        .update({
          public_price: pkg.public_price,
          reseller_price: pkg.reseller_price,
          is_unavailable: pkg.is_unavailable,
          validity: pkg.validity,
        })
        .eq("id", pkg.id);
      if (error) throw error;
      toast.success("Package updated");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const addPackage = async () => {
    if (!form.package_size.trim()) {
      toast.error("Enter package size (e.g. 1GB)");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("packages").insert({
        network: form.network,
        package_size: form.package_size.trim(),
        public_price: Number(form.public_price) || 0,
        reseller_price: Number(form.reseller_price) || 0,
        validity: form.validity || "No Expiry",
      });
      if (error) throw error;
      toast.success("Package added");
      setForm({
        network: "MTN",
        package_size: "",
        public_price: "",
        reseller_price: "",
        validity: "No Expiry",
      });
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add package");
    } finally {
      setBusy(false);
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
        <h2 className="font-heading text-xl font-bold text-foreground">Packages</h2>
        <p className="mt-1 text-xs text-muted-foreground">Set reseller and public prices by network.</p>
      </div>

      <GlassCard variant="strong" className="space-y-3">
        <h3 className="font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Add package
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Network</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.network}
              onChange={(e) => setForm((f) => ({ ...f, network: e.target.value }))}
            >
              {NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Size</Label>
            <Input
              value={form.package_size}
              onChange={(e) => setForm((f) => ({ ...f, package_size: e.target.value }))}
              placeholder="1GB"
            />
          </div>
          <div>
            <Label>Public price</Label>
            <Input
              type="number"
              value={form.public_price}
              onChange={(e) => setForm((f) => ({ ...f, public_price: e.target.value }))}
            />
          </div>
          <div>
            <Label>Reseller price</Label>
            <Input
              type="number"
              value={form.reseller_price}
              onChange={(e) => setForm((f) => ({ ...f, reseller_price: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button variant="hero" className="w-full" disabled={busy} onClick={() => void addPackage()}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-3">
        {rows.map((pkg) => (
          <GlassCard key={pkg.id} variant="strong" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-heading text-sm font-semibold text-foreground">
                  {pkg.network} · {pkg.package_size}
                </p>
                <p className="text-[11px] text-muted-foreground">{pkg.validity}</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={pkg.is_unavailable}
                  onChange={(e) =>
                    setRows((list) =>
                      list.map((r) =>
                        r.id === pkg.id ? { ...r, is_unavailable: e.target.checked } : r,
                      ),
                    )
                  }
                />
                Unavailable
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Public</Label>
                <Input
                  type="number"
                  value={pkg.public_price}
                  onChange={(e) =>
                    setRows((list) =>
                      list.map((r) =>
                        r.id === pkg.id ? { ...r, public_price: Number(e.target.value) } : r,
                      ),
                    )
                  }
                />
              </div>
              <div>
                <Label>Reseller</Label>
                <Input
                  type="number"
                  value={pkg.reseller_price}
                  onChange={(e) =>
                    setRows((list) =>
                      list.map((r) =>
                        r.id === pkg.id ? { ...r, reseller_price: Number(e.target.value) } : r,
                      ),
                    )
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void savePrices(pkg)}
                >
                  Save · {fmtGHS(Number(pkg.reseller_price))}
                </Button>
              </div>
            </div>
            <p
              className={cn(
                "text-[11px]",
                pkg.is_unavailable ? "text-destructive" : "text-muted-foreground",
              )}
            >
              Margin {fmtGHS(Number(pkg.public_price) - Number(pkg.reseller_price))}
            </p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
