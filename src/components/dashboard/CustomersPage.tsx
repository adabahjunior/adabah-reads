import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function CustomersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ customer_phone: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("orders")
      .select("customer_phone, created_at")
      .eq("reseller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const customers = useMemo(() => {
    const map = new Map<string, { phone: string; count: number; last: string }>();
    for (const r of rows) {
      const phone = r.customer_phone;
      const existing = map.get(phone);
      if (!existing) map.set(phone, { phone, count: 1, last: r.created_at });
      else existing.count += 1;
    }
    return Array.from(map.values());
  }, [rows]);

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
        <h2 className="font-heading text-xl font-bold text-foreground">Customers</h2>
        <p className="mt-1 text-xs text-muted-foreground">Unique phone numbers from your order history.</p>
      </div>
      <GlassCard variant="strong">
        {customers.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 py-2.5 text-left uppercase">Phone</th>
                  <th className="px-2 py-2.5 text-left uppercase">Orders</th>
                  <th className="px-2 py-2.5 text-left uppercase">Last order</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.phone} className="border-b border-border/50">
                    <td className="px-2 py-2.5 font-mono">{c.phone}</td>
                    <td className="px-2 py-2.5">{c.count}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {new Date(c.last).toLocaleString()}
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
