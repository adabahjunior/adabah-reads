import { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  buildBulkRows,
  detectNetwork,
  normalizeGhanaPhone,
  parsePhoneList,
  phonesFromSpreadsheetFile,
  type Network,
  type ParsedBulkRow,
} from "@/lib/ghana-phone";
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

type BulkResult = ParsedBulkRow & {
  status: "pending" | "ok" | "failed" | "skipped";
  message?: string;
  price?: number;
};

const NETWORKS: { id: Network; color: string }[] = [
  { id: "MTN", color: "bg-[oklch(0.85_0.18_95)] text-[oklch(0.2_0.05_95)]" },
  { id: "Telecel", color: "bg-[oklch(0.55_0.2_25)] text-white" },
  { id: "AirtelTigo", color: "bg-[oklch(0.45_0.18_280)] text-white" },
];

export function BuyDataPage() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [network, setNetwork] = useState<Network | null>(null);
  const [selected, setSelected] = useState<PackageRow | null>(null);
  const [packageSize, setPackageSize] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkRows, setBulkRows] = useState<BulkResult[]>([]);
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [pkgRes, walletRes] = await Promise.all([
        supabase.from("packages").select("*").eq("is_unavailable", false).order("reseller_price"),
        user
          ? supabase.from("wallets").select("balance").eq("reseller_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setPackages((pkgRes.data as PackageRow[]) ?? []);
      setBalance(Number(walletRes.data?.balance ?? 0));
      setLoading(false);
    })();
  }, []);

  const bundles = useMemo(
    () => packages.filter((p) => p.network === network),
    [packages, network],
  );

  const packageSizes = useMemo(() => {
    const sizes = [...new Set(packages.map((p) => p.package_size))];
    return sizes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [packages]);

  const findPackage = (net: Network, size: string) =>
    packages.find((p) => p.network === net && p.package_size === size) ?? null;

  const previewBulk = (phones: string[]) => {
    if (!packageSize) {
      toast.error("Select a package size first.");
      return;
    }
    const rows = buildBulkRows(phones).map((row): BulkResult => {
      if (!row.network) {
        return { ...row, status: "skipped", message: row.error ?? "Unknown network prefix" };
      }
      const pkg = findPackage(row.network, packageSize);
      if (!pkg) {
        return {
          ...row,
          status: "skipped",
          message: `No ${packageSize} package for ${row.network}`,
        };
      }
      return {
        ...row,
        status: "pending",
        price: Number(pkg.reseller_price),
      };
    });
    setBulkRows(rows);
    if (rows.length === 0) toast.error("No valid phone numbers found.");
  };

  const onPhoneChange = (value: string) => {
    setPhone(value);
    const detected = detectNetwork(value);
    if (detected && detected !== network) {
      setNetwork(detected);
      setSelected((prev) =>
        prev && prev.network === detected
          ? prev
          : packages.find((p) => p.network === detected && p.package_size === prev?.package_size) ??
            null,
      );
    }
  };

  const submitSingle = async () => {
    if (!selected || !network) return;
    const cleaned = normalizeGhanaPhone(phone);
    if (!cleaned) {
      toast.error("Enter a valid Ghana number (10 digits starting with 0).");
      return;
    }
    const detected = detectNetwork(cleaned);
    if (detected && detected !== network) {
      toast.error(`Number looks like ${detected}, but you selected ${network}.`);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("create_wallet_order", {
        _phone: cleaned,
        _network: network,
        _package_size: selected.package_size,
      });
      if (error) throw error;
      toast.success(`${network} ${selected.package_size} sent to ${cleaned}`);
      setBalance((b) => b - Number(selected.reseller_price));
      setSelected(null);
      setPhone("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed");
    } finally {
      setBusy(false);
    }
  };

  const submitBulk = async () => {
    if (!packageSize) {
      toast.error("Select a package size.");
      return;
    }
    const pending = bulkRows.filter((r) => r.status === "pending" && r.network && r.price != null);
    if (pending.length === 0) {
      toast.error("Nothing to order — fix skipped numbers or re-preview.");
      return;
    }
    const total = pending.reduce((s, r) => s + (r.price ?? 0), 0);
    if (total > balance) {
      toast.error(`Need ${fmtGHS(total)} but wallet has ${fmtGHS(balance)}.`);
      return;
    }

    setBusy(true);
    let ok = 0;
    let failed = 0;
    let spent = 0;
    const next = [...bulkRows];

    for (let i = 0; i < next.length; i++) {
      const row = next[i];
      if (!row || row.status !== "pending" || !row.network || row.price == null) continue;

      try {
        const { error } = await supabase.rpc("create_wallet_order", {
          _phone: row.phone,
          _network: row.network,
          _package_size: packageSize,
        });
        if (error) throw error;
        next[i] = { ...row, status: "ok", message: "Ordered" };
        ok += 1;
        spent += row.price;
        setBalance((b) => b - row.price!);
      } catch (err) {
        next[i] = {
          ...row,
          status: "failed",
          message: err instanceof Error ? err.message : "Failed",
        };
        failed += 1;
      }
      setBulkRows([...next]);
    }

    setBusy(false);
    if (ok > 0) toast.success(`${ok} order${ok === 1 ? "" : "s"} placed · ${fmtGHS(spent)}`);
    if (failed > 0) toast.error(`${failed} order${failed === 1 ? "" : "s"} failed`);
  };

  const onUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const phones = await phonesFromSpreadsheetFile(file);
      setBulkText(phones.join("\n"));
      previewBulk(phones);
      toast.success(`Loaded ${phones.length} number${phones.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read file");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const bulkTotal = useMemo(
    () =>
      bulkRows
        .filter((r) => r.status === "pending" || r.status === "ok")
        .reduce((s, r) => s + (r.price ?? 0), 0),
    [bulkRows],
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Buy Data</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Single or bulk purchase — bulk auto-detects MTN, Telecel & AirtelTigo from the number.
          </p>
        </div>
        <div className="chip">Wallet {fmtGHS(balance)}</div>
      </div>

      <div className="grid max-w-md grid-cols-2 rounded-lg border border-border bg-muted/50 p-1">
        {(["single", "bulk"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={cn(
              "rounded-md px-3 py-2.5 text-sm font-semibold capitalize transition-all",
              mode === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {NETWORKS.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  setNetwork(n.id);
                  setSelected(null);
                }}
                className={cn(
                  "rounded-xl p-5 text-left font-heading text-lg font-bold transition-all hover-lift",
                  n.color,
                  network === n.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                )}
              >
                {n.id}
              </button>
            ))}
          </div>

          {network ? (
            <GlassCard variant="strong">
              <h3 className="font-heading mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {network} bundles
              </h3>
              {bundles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No packages for this network yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {bundles.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelected(b)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all",
                        selected?.id === b.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <p className="font-heading text-lg font-bold text-foreground">{b.package_size}</p>
                      <p className="mt-1 text-sm text-primary">{fmtGHS(Number(b.reseller_price))}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{b.validity}</p>
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>
          ) : null}

          {selected ? (
            <GlassCard variant="strong" className="space-y-4">
              <div>
                <Label htmlFor="phone">Customer phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  placeholder="024XXXXXXX"
                />
                {detectNetwork(phone) ? (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Detected network:{" "}
                    <span className="font-semibold text-primary">{detectNetwork(phone)}</span>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Will debit{" "}
                  <span className="font-semibold text-primary">
                    {fmtGHS(Number(selected.reseller_price))}
                  </span>{" "}
                  from wallet
                </p>
                <Button variant="hero" disabled={busy} onClick={() => void submitSingle()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm purchase"}
                </Button>
              </div>
            </GlassCard>
          ) : null}
        </>
      ) : (
        <>
          <GlassCard variant="strong" className="space-y-4">
            <div>
              <h3 className="font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Package size (all numbers)
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {packageSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPackageSize(size);
                      setBulkRows([]);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-semibold transition-all",
                      packageSize === size
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:border-primary/40",
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="bulkPhones">Phone numbers</Label>
              <textarea
                id="bulkPhones"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={6}
                placeholder={"024XXXXXXX, 020XXXXXXX\n027XXXXXXX"}
                className="mt-1.5 flex w-full rounded-lg border border-border bg-input px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Separate with commas or new lines. Network is detected from each prefix.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => previewBulk(parsePhoneList(bulkText))}
                disabled={!packageSize}
              >
                Preview &amp; detect networks
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Upload spreadsheet
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
              />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Numbers-only CSV, TXT, or Excel (.xlsx). One number per cell or row.
            </p>
          </GlassCard>

          {bulkRows.length > 0 ? (
            <GlassCard variant="strong" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    Bulk preview · {packageSize}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {bulkRows.filter((r) => r.status === "pending").length} ready · estimated{" "}
                    {fmtGHS(
                      bulkRows
                        .filter((r) => r.status === "pending")
                        .reduce((s, r) => s + (r.price ?? 0), 0),
                    )}
                    {bulkTotal > 0 && busy ? ` · processed ${fmtGHS(bulkTotal)}` : null}
                  </p>
                </div>
                <Button
                  variant="hero"
                  disabled={busy || bulkRows.every((r) => r.status !== "pending")}
                  onClick={() => void submitBulk()}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place bulk orders"}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] tracking-wider text-muted-foreground uppercase">
                      <th className="pb-2 font-medium">Phone</th>
                      <th className="pb-2 font-medium">Network</th>
                      <th className="pb-2 font-medium">Price</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row) => (
                      <tr key={row.phone} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 font-mono text-xs">{row.phone}</td>
                        <td className="py-2.5">{row.network ?? "—"}</td>
                        <td className="py-2.5">
                          {row.price != null ? fmtGHS(row.price) : "—"}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              row.status === "ok" && "text-success",
                              row.status === "failed" && "text-destructive",
                              row.status === "skipped" && "text-muted-foreground",
                              row.status === "pending" && "text-primary",
                            )}
                          >
                            {row.message ?? row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          ) : null}
        </>
      )}
    </div>
  );
}
