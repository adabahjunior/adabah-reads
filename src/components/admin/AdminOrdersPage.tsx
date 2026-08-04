import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmtGHS } from "@/lib/utils";

type OrderRow = {
  id: string;
  created_at: string;
  reseller_id: string | null;
  customer_phone: string;
  network: string | null;
  package_size: string | null;
  amount: number;
  profit: number;
  status: "completed" | "pending" | "processing" | "failed";
};

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, created_at, reseller_id, customer_phone, network, package_size, amount, profit, status",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((data as OrderRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const setStatus = async (id: string, status: OrderRow["status"]) => {
    setBusyId(id);
    try {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success(`Order marked ${status}`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
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
        <h2 className="font-heading text-xl font-bold text-foreground">Orders</h2>
        <p className="mt-1 text-xs text-muted-foreground">Review and update fulfillment status.</p>
      </div>

      <GlassCard variant="strong">
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] tracking-wider text-muted-foreground uppercase">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Bundle</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
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
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(["processing", "completed", "failed"] as const).map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            disabled={busyId === o.id || o.status === s}
                            onClick={() => void setStatus(o.id, s)}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
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
