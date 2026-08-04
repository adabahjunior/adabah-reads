import { useEffect, useState } from "react";
import { FileText, KeyRound, ShoppingCart, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassCard } from "@/components/GlassCard";
import { StatsCard } from "@/components/StatsCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fmtGHS } from "@/lib/utils";

type OrderRow = {
  id: string;
  created_at: string;
  customer_phone: string;
  network: string | null;
  package_size: string | null;
  amount: number;
  status: "completed" | "pending" | "processing" | "failed";
};

export function OverviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const [walletRes, ordersRes, profileRes] = await Promise.all([
        supabase.from("wallets").select("balance").eq("reseller_id", user.id).maybeSingle(),
        supabase
          .from("orders")
          .select("id, created_at, customer_phone, network, package_size, amount, status")
          .eq("reseller_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setWalletBalance(Number(walletRes.data?.balance ?? 0));
      setOrders((ordersRes.data as OrderRow[]) ?? []);
      setProfileName(profileRes.data?.full_name || user.email || "Reseller");
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const completedSales = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + Number(o.amount), 0);

  const monthMap = new Map<string, number>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthMap.set(d.toLocaleString("default", { month: "short" }), 0);
  }
  for (const o of orders) {
    if (o.status !== "completed") continue;
    const key = new Date(o.created_at).toLocaleString("default", { month: "short" });
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + Number(o.amount));
  }
  const chartData = Array.from(monthMap.entries()).map(([month, sales]) => ({ month, sales }));
  const recent = orders.slice(0, 5);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">Welcome back 👋</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {profileName} · Here&apos;s your BundleMart business at a glance
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard
          title="Total Sales"
          value={loading ? "…" : fmtGHS(completedSales)}
          icon={ShoppingCart}
          change="Completed orders"
          positive
          variant="yellow"
        />
        <StatsCard
          title="Wallet"
          value={loading ? "…" : fmtGHS(walletBalance)}
          icon={Wallet}
          variant="dark"
        />
        <StatsCard
          title="Orders"
          value={loading ? "…" : orders.length.toLocaleString()}
          icon={FileText}
          change="All time"
          positive
        />
        <StatsCard title="API Ready" value="Keys" icon={KeyRound} change="See API Access" positive />
      </div>

      <GlassCard variant="strong">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Sales Overview
          </h3>
          <span className="chip text-[10px]">Last 6 months</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.16 85)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.78 0.16 85)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.01 260 / 40%)" vertical={false} />
              <XAxis dataKey="month" stroke="oklch(0.65 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.65 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.18 0.015 260 / 95%)",
                  border: "1px solid oklch(0.35 0.01 260 / 50%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "oklch(0.95 0 0)",
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="oklch(0.78 0.16 85)"
                fill="url(#goldGrad)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard variant="strong">
        <h3 className="font-heading mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Recent Orders
        </h3>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No orders yet. Buy data for a customer to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 py-2.5 text-left font-medium tracking-wider uppercase">Phone</th>
                  <th className="hidden px-2 py-2.5 text-left font-medium tracking-wider uppercase sm:table-cell">
                    Network
                  </th>
                  <th className="px-2 py-2.5 text-left font-medium tracking-wider uppercase">Bundle</th>
                  <th className="px-2 py-2.5 text-left font-medium tracking-wider uppercase">Amount</th>
                  <th className="px-2 py-2.5 text-left font-medium tracking-wider uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="px-2 py-2.5 font-mono text-foreground">{o.customer_phone}</td>
                    <td className="hidden px-2 py-2.5 text-muted-foreground sm:table-cell">{o.network}</td>
                    <td className="px-2 py-2.5 text-foreground">{o.package_size}</td>
                    <td className="px-2 py-2.5 font-medium text-primary">{fmtGHS(Number(o.amount))}</td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
