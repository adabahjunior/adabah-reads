import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Users, X } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { detectNetwork, normalizeGhanaPhone } from "@/lib/ghana-phone";
import { cn } from "@/lib/utils";

type CustomerRow = {
  phone: string;
  count: number;
  last: string;
  network: string | null;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function CustomersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ customer_phone: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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
    const map = new Map<string, CustomerRow>();
    for (const r of rows) {
      const phone = r.customer_phone;
      const existing = map.get(phone);
      if (!existing) {
        map.set(phone, {
          phone,
          count: 1,
          last: r.created_at,
          network: detectNetwork(phone),
        });
      } else {
        existing.count += 1;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last).getTime() - new Date(a.last).getTime(),
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return customers;

    const qDigits = digitsOnly(q);
    const qNorm = normalizeGhanaPhone(q);
    const qLower = q.toLowerCase();

    return customers.filter((c) => {
      const phoneDigits = digitsOnly(c.phone);
      if (qNorm && c.phone === qNorm) return true;
      if (qDigits && phoneDigits.includes(qDigits)) return true;
      if (c.network?.toLowerCase().includes(qLower)) return true;
      return c.phone.toLowerCase().includes(qLower);
    });
  }, [customers, query]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Customers</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Search unique phone numbers from your order history.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span>
            {filtered.length}
            {query.trim() ? ` of ${customers.length}` : ""} customer
            {filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <GlassCard variant="strong" className="space-y-4 !p-4 sm:!p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by phone (e.g. 024… or 233…)"
            className="h-11 pr-10 pl-10 font-mono text-sm"
            inputMode="tel"
            autoComplete="tel"
            aria-label="Search customers by phone number"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {customers.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No customers yet.</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No customers match <span className="font-mono text-foreground">{query.trim()}</span>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 py-2.5 text-left uppercase">Phone</th>
                  <th className="px-2 py-2.5 text-left uppercase">Network</th>
                  <th className="px-2 py-2.5 text-left uppercase">Orders</th>
                  <th className="px-2 py-2.5 text-left uppercase">Last order</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.phone} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="px-2 py-2.5 font-mono text-foreground">{c.phone}</td>
                    <td className="px-2 py-2.5">
                      {c.network ? (
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                            c.network === "MTN" &&
                              "bg-[oklch(0.85_0.18_95)] text-[oklch(0.2_0.05_95)]",
                            c.network === "Telecel" && "bg-[oklch(0.55_0.2_25)] text-white",
                            c.network === "AirtelTigo" && "bg-[oklch(0.45_0.18_280)] text-white",
                          )}
                        >
                          {c.network}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
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
