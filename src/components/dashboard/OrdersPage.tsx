import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
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
  profit: number;
  status: "completed" | "pending" | "processing" | "failed";
};

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("orders")
      .select("id, created_at, customer_phone, network, package_size, amount, profit, status")
      .eq("reseller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as OrderRow[]) ?? []);
        setLoading(false);
      });
  }, [user]);

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
        <h2 className="font-heading text-xl font-bold text-foreground">My Orders</h2>
        <p className="mt-1 text-xs text-muted-foreground">Track every delivery from your wallet purchases.</p>
      </div>
      <GlassCard variant="strong">
        {orders.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 py-2.5 text-left uppercase">Time</th>
                  <th className="px-2 py-2.5 text-left uppercase">Phone</th>
                  <th className="px-2 py-2.5 text-left uppercase">Network</th>
                  <th className="px-2 py-2.5 text-left uppercase">Bundle</th>
                  <th className="px-2 py-2.5 text-left uppercase">Cost</th>
                  <th className="px-2 py-2.5 text-left uppercase">Profit</th>
                  <th className="px-2 py-2.5 text-left uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/50">
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="px-2 py-2.5 font-mono">{o.customer_phone}</td>
                    <td className="px-2 py-2.5">{o.network}</td>
                    <td className="px-2 py-2.5">{o.package_size}</td>
                    <td className="px-2 py-2.5 text-primary">{fmtGHS(Number(o.amount))}</td>
                    <td className="px-2 py-2.5 text-success">{fmtGHS(Number(o.profit))}</td>
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
