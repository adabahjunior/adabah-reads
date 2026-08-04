import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, KeyRound, Loader2, Minus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn, fmtGHS } from "@/lib/utils";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  topup_code: string | null;
  created_at: string;
};

type Tab = "overview" | "orders" | "transactions" | "customers" | "api" | "packages";

export function AdminUserDetailPage({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [balance, setBalance] = useState(0);
  const [profit, setProfit] = useState(0);
  const [orders, setOrders] = useState<
    {
      id: string;
      created_at: string;
      customer_phone: string;
      network: string | null;
      package_size: string | null;
      amount: number;
      status: "completed" | "pending" | "processing" | "failed";
    }[]
  >([]);
  const [txs, setTxs] = useState<
    { id: string; type: string; amount: number; description: string | null; created_at: string }[]
  >([]);
  const [keys, setKeys] = useState<
    {
      id: string;
      name: string;
      key_prefix: string;
      created_at: string;
      last_used_at: string | null;
      revoked_at: string | null;
    }[]
  >([]);
  const [packages, setPackages] = useState<
    { network: string; package_size: string; base_price: number; profit: number; sell_price: number; is_active: boolean }[]
  >([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const reload = async () => {
    const [p, r, w, o, t, k, pkg] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("wallets").select("balance, total_profit").eq("reseller_id", userId).maybeSingle(),
      supabase
        .from("orders")
        .select("id, created_at, customer_phone, network, package_size, amount, status")
        .eq("reseller_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("wallet_transactions")
        .select("id, type, amount, description, created_at")
        .eq("reseller_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("api_keys")
        .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
        .eq("reseller_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("reseller_packages")
        .select("network, package_size, base_price, profit, sell_price, is_active")
        .eq("reseller_id", userId)
        .order("network"),
    ]);

    setProfile((p.data as Profile) ?? null);
    setRoles((r.data ?? []).map((x) => x.role));
    setBalance(Number(w.data?.balance ?? 0));
    setProfit(Number(w.data?.total_profit ?? 0));
    setOrders((o.data as typeof orders) ?? []);
    setTxs((t.data as typeof txs) ?? []);
    setKeys((k.data as typeof keys) ?? []);
    setPackages((pkg.data as typeof packages) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, [userId]);

  const customers = useMemo(() => {
    const map = new Map<string, { phone: string; count: number; last: string }>();
    for (const o of orders) {
      const existing = map.get(o.customer_phone);
      if (!existing) map.set(o.customer_phone, { phone: o.customer_phone, count: 1, last: o.created_at });
      else existing.count += 1;
    }
    return Array.from(map.values());
  }, [orders]);

  const adjust = async (direction: "credit" | "debit") => {
    const value = Math.abs(Number(amount));
    if (!value) {
      toast.error("Enter an amount");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_adjust_wallet", {
        _reseller_id: userId,
        _amount: direction === "credit" ? value : -value,
        _note: note.trim() || `Admin ${direction} from account page`,
      });
      if (error) throw error;
      toast.success(direction === "credit" ? "Credited" : "Debited");
      setAmount("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_revoke_api_key", { _key_id: id });
      if (error) throw error;
      toast.success("API key revoked");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  };

  const rotateKey = async (id: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_rotate_api_key", { _key_id: id });
      if (error) throw error;
      const payload = data as { api_key?: string };
      if (payload.api_key) setFreshKey(payload.api_key);
      toast.success("API key rotated — copy the new key now");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rotate failed");
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Orders" },
    { id: "transactions", label: "Transactions" },
    { id: "customers", label: "Customers" },
    { id: "api", label: "API keys" },
    { id: "packages", label: "Packages" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">User not found.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/resellers">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/resellers">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            {profile.full_name || "Unnamed"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {profile.email} · {profile.phone || "no phone"} · roles: {roles.join(", ") || "none"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <GlassCard variant="strong">
          <p className="text-xs text-muted-foreground">Top-up code</p>
          <p className="font-mono mt-1 text-3xl font-bold tracking-[0.2em] text-primary">
            {profile.topup_code || "————"}
          </p>
        </GlassCard>
        <GlassCard variant="strong">
          <p className="text-xs text-muted-foreground">Wallet</p>
          <p className="font-heading mt-1 text-3xl font-bold text-foreground">{fmtGHS(balance)}</p>
        </GlassCard>
        <GlassCard variant="strong">
          <p className="text-xs text-muted-foreground">Profit</p>
          <p className="font-heading mt-1 text-3xl font-bold text-foreground">{fmtGHS(profit)}</p>
        </GlassCard>
      </div>

      <GlassCard variant="strong" className="space-y-3">
        <h3 className="font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Credit / debit wallet
        </h3>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              className="w-36"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button variant="hero" size="sm" disabled={busy} onClick={() => void adjust("credit")}>
            <Plus className="h-4 w-4" /> Credit
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void adjust("debit")}>
            <Minus className="h-4 w-4" /> Debit
          </Button>
        </div>
      </GlassCard>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-2 text-xs font-semibold transition-all",
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <GlassCard variant="strong" className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Joined:</span>{" "}
            {new Date(profile.created_at).toLocaleString()}
          </p>
          <p>
            <span className="text-muted-foreground">Orders:</span> {orders.length}
          </p>
          <p>
            <span className="text-muted-foreground">Active API keys:</span>{" "}
            {keys.filter((k) => !k.revoked_at).length}
          </p>
          <p>
            <span className="text-muted-foreground">Unique customers:</span> {customers.length}
          </p>
        </GlassCard>
      ) : null}

      {tab === "orders" ? (
        <GlassCard variant="strong">
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] tracking-wider text-muted-foreground uppercase">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Phone</th>
                    <th className="pb-2 font-medium">Bundle</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 text-muted-foreground">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 font-mono text-xs">{o.customer_phone}</td>
                      <td className="py-2">
                        {o.network} {o.package_size}
                      </td>
                      <td className="py-2">{fmtGHS(Number(o.amount))}</td>
                      <td className="py-2">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      ) : null}

      {tab === "transactions" ? (
        <GlassCard variant="strong">
          {txs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No transactions.</p>
          ) : (
            <div className="space-y-2">
              {txs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm text-foreground">{tx.description || tx.type}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      Number(tx.amount) < 0 ? "text-destructive" : "text-success",
                    )}
                  >
                    {Number(tx.amount) > 0 ? "+" : ""}
                    {fmtGHS(Number(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      ) : null}

      {tab === "customers" ? (
        <GlassCard variant="strong">
          {customers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No customers yet.</p>
          ) : (
            <div className="space-y-2">
              {customers.map((c) => (
                <div
                  key={c.phone}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
                >
                  <div>
                    <p className="font-mono text-sm text-foreground">{c.phone}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Last {new Date(c.last).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.count} orders</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      ) : null}

      {tab === "api" ? (
        <div className="space-y-4">
          {freshKey ? (
            <GlassCard variant="yellow" className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider">New key (shown once)</p>
              <div className="flex flex-wrap gap-2">
                <code className="flex-1 break-all rounded-md bg-background/40 px-3 py-2 font-mono text-sm">
                  {freshKey}
                </code>
                <Button
                  size="sm"
                  variant="hero"
                  onClick={() => {
                    void navigator.clipboard.writeText(freshKey);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
            </GlassCard>
          ) : null}
          <GlassCard variant="strong">
            {keys.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No API keys.</p>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-3"
                  >
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <KeyRound className="h-3.5 w-3.5 text-primary" />
                        {k.name}
                        {k.revoked_at ? (
                          <span className="text-[11px] text-destructive">Revoked</span>
                        ) : (
                          <span className="text-[11px] text-success">Active</span>
                        )}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {k.key_prefix}•••• · {new Date(k.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!k.revoked_at ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void rotateKey(k.id)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Rotate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          disabled={busy}
                          onClick={() => void revokeKey(k.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      ) : null}

      {tab === "packages" ? (
        <GlassCard variant="strong">
          {packages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No custom API package pricing set.
            </p>
          ) : (
            <div className="space-y-2">
              {packages.map((p) => (
                <div
                  key={`${p.network}-${p.package_size}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2.5 text-sm"
                >
                  <p>
                    {p.network} {p.package_size}{" "}
                    {!p.is_active ? (
                      <span className="text-[11px] text-muted-foreground">(inactive)</span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground">
                    Base {fmtGHS(Number(p.base_price))} + {fmtGHS(Number(p.profit))} ={" "}
                    <span className="font-semibold text-primary">{fmtGHS(Number(p.sell_price))}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      ) : null}
    </div>
  );
}
