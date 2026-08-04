import { useEffect, useState } from "react";
import { Loader2, ShoppingCart, Users, Wallet, ArrowDownToLine } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatsCard } from "@/components/StatsCard";
import { StatusBadge } from "@/components/StatusBadge";
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

export function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    orders: 0,
    resellers: 0,
    pendingWithdrawals: 0,
    walletFloat: 0,
  });
  const [recent, setRecent] = useState<OrderRow[]>([]);

  useEffect(() => {
    void (async () => {
      const [orders, roles, withdrawals, wallets, recentOrders] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "reseller"),
        supabase
          .from("withdrawals")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("wallets").select("balance"),
        supabase
          .from("orders")
          .select("id, created_at, customer_phone, network, package_size, amount, status")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      setStats({
        orders: orders.count ?? 0,
        resellers: roles.count ?? 0,
        pendingWithdrawals: withdrawals.count ?? 0,
        walletFloat: (wallets.data ?? []).reduce((s, w) => s + Number(w.balance ?? 0), 0),
      });
      setRecent((recentOrders.data as OrderRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

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
        <h2 className="font-heading text-xl font-bold text-foreground">Overview</h2>
        <p className="mt-1 text-xs text-muted-foreground">Platform health across resellers and orders.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total orders" value={String(stats.orders)} icon={ShoppingCart} variant="yellow" />
        <StatsCard title="Resellers" value={String(stats.resellers)} icon={Users} />
        <StatsCard
          title="Pending withdrawals"
          value={String(stats.pendingWithdrawals)}
          icon={ArrowDownToLine}
        />
        <StatsCard title="Wallet float" value={fmtGHS(stats.walletFloat)} icon={Wallet} variant="dark" />
      </div>

      <GlassCard variant="strong">
        <h3 className="font-heading mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Recent orders
        </h3>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
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
                {recent.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5">{o.customer_phone}</td>
                    <td className="py-2.5">
                      {o.network} {o.package_size}
                    </td>
                    <td className="py-2.5">{fmtGHS(Number(o.amount))}</td>
                    <td className="py-2.5">
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
