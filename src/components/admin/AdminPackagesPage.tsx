import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Power, Trash2 } from "lucide-react";
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

type Draft = {
  package_size: string;
  price: string;
  validity: string;
};

const NETWORKS = ["MTN", "Telecel", "AirtelTigo"] as const;

const NETWORK_STYLES: Record<(typeof NETWORKS)[number], string> = {
  MTN: "bg-[oklch(0.85_0.18_95)] text-[oklch(0.2_0.05_95)]",
  Telecel: "bg-[oklch(0.55_0.2_25)] text-white",
  AirtelTigo: "bg-[oklch(0.45_0.18_280)] text-white",
};

const emptyDraft = (): Draft => ({
  package_size: "",
  price: "",
  validity: "No Expiry",
});

export function AdminPackagesPage() {
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeNetwork, setActiveNetwork] = useState<(typeof NETWORKS)[number]>("MTN");
  const [form, setForm] = useState({ network: "MTN" as string, ...emptyDraft() });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const reload = async () => {
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .order("network", { ascending: true })
      .order("reseller_price", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as PackageRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const byNetwork = useMemo(() => {
    const map = Object.fromEntries(NETWORKS.map((n) => [n, [] as PackageRow[]])) as Record<
      (typeof NETWORKS)[number],
      PackageRow[]
    >;
    for (const row of rows) {
      if (row.network in map) map[row.network as (typeof NETWORKS)[number]].push(row);
    }
    return map;
  }, [rows]);

  const visible = byNetwork[activeNetwork] ?? [];

  const addPackage = async () => {
    if (!form.package_size.trim()) {
      toast.error("Enter package size (e.g. 1GB)");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setBusyId("new");
    try {
      const { error } = await supabase.from("packages").insert({
        network: form.network,
        package_size: form.package_size.trim(),
        reseller_price: price,
        public_price: price,
        validity: form.validity.trim() || "No Expiry",
        is_unavailable: false,
      });
      if (error) throw error;
      toast.success("Package added");
      setForm({ network: activeNetwork, ...emptyDraft() });
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add package");
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (pkg: PackageRow) => {
    setEditingId(pkg.id);
    setDraft({
      package_size: pkg.package_size,
      price: String(pkg.reseller_price),
      validity: pkg.validity || "No Expiry",
    });
  };

  const saveEdit = async (pkg: PackageRow) => {
    if (!draft.package_size.trim()) {
      toast.error("Package size is required");
      return;
    }
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setBusyId(pkg.id);
    try {
      const { error } = await supabase
        .from("packages")
        .update({
          package_size: draft.package_size.trim(),
          reseller_price: price,
          public_price: price,
          validity: draft.validity.trim() || "No Expiry",
          updated_at: new Date().toISOString(),
        })
        .eq("id", pkg.id);
      if (error) throw error;
      toast.success("Package updated");
      setEditingId(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const togglePackage = async (pkg: PackageRow) => {
    setBusyId(pkg.id);
    try {
      const { error } = await supabase
        .from("packages")
        .update({
          is_unavailable: !pkg.is_unavailable,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pkg.id);
      if (error) throw error;
      toast.success(pkg.is_unavailable ? "Package enabled" : "Package turned off");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setBusyId(null);
    }
  };

  const deletePackage = async (pkg: PackageRow) => {
    if (!window.confirm(`Delete ${pkg.network} ${pkg.package_size}? This cannot be undone.`)) {
      return;
    }
    setBusyId(pkg.id);
    try {
      const { error } = await supabase.from("packages").delete().eq("id", pkg.id);
      if (error) throw error;
      toast.success("Package deleted");
      if (editingId === pkg.id) setEditingId(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
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
        <p className="mt-1 text-xs text-muted-foreground">
          Set one price per bundle. Resellers pay that price on the dashboard and via API.
        </p>
      </div>

      <GlassCard variant="strong" className="space-y-3">
        <h3 className="font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Add package
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Network</Label>
            <select
              className="mt-1.5 flex h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
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
              className="mt-1.5"
              value={form.package_size}
              onChange={(e) => setForm((f) => ({ ...f, package_size: e.target.value }))}
              placeholder="1GB"
            />
          </div>
          <div>
            <Label>Price (GHS)</Label>
            <Input
              className="mt-1.5"
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Validity</Label>
            <Input
              className="mt-1.5"
              value={form.validity}
              onChange={(e) => setForm((f) => ({ ...f, validity: e.target.value }))}
              placeholder="No Expiry"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="hero"
              className="w-full"
              disabled={busyId === "new"}
              onClick={() => void addPackage()}
            >
              {busyId === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="flex flex-wrap gap-2">
        {NETWORKS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setActiveNetwork(n);
              setForm((f) => ({ ...f, network: n }));
              setEditingId(null);
            }}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
              activeNetwork === n
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {n}
            <span className="ml-2 text-[10px] opacity-70">{byNetwork[n].length}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-bold tracking-wide",
              NETWORK_STYLES[activeNetwork],
            )}
          >
            {activeNetwork}
          </span>
          <p className="text-xs text-muted-foreground">
            {visible.length} package{visible.length === 1 ? "" : "s"}
          </p>
        </div>

        {visible.length === 0 ? (
          <GlassCard variant="strong" className="py-10 text-center text-sm text-muted-foreground">
            No {activeNetwork} packages yet. Add one above.
          </GlassCard>
        ) : (
          visible.map((pkg) => {
            const editing = editingId === pkg.id;
            const busy = busyId === pkg.id;
            return (
              <GlassCard
                key={pkg.id}
                variant="strong"
                className={cn("space-y-3", pkg.is_unavailable && "opacity-70")}
              >
                {editing ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label>Size</Label>
                      <Input
                        className="mt-1.5"
                        value={draft.package_size}
                        onChange={(e) => setDraft((d) => ({ ...d, package_size: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Price (GHS)</Label>
                      <Input
                        className="mt-1.5"
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.price}
                        onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Validity</Label>
                      <Input
                        className="mt-1.5"
                        value={draft.validity}
                        onChange={(e) => setDraft((d) => ({ ...d, validity: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        variant="hero"
                        className="flex-1"
                        disabled={busy}
                        onClick={() => void saveEdit(pkg)}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-base font-semibold text-foreground">
                          {pkg.package_size}
                        </p>
                        {pkg.is_unavailable ? (
                          <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive uppercase">
                            Off
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase">
                            On
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{pkg.validity}</p>
                    </div>
                    <p className="font-heading text-xl font-bold text-primary">
                      {fmtGHS(Number(pkg.reseller_price))}
                    </p>
                  </div>
                )}

                {!editing ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => startEdit(pkg)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void togglePackage(pkg)}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {pkg.is_unavailable ? "Turn on" : "Turn off"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="text-destructive"
                      onClick={() => void deletePackage(pkg)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                ) : null}
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}
