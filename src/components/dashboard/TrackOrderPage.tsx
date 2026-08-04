import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeGhanaPhone } from "@/lib/ghana-phone";
import { supabase } from "@/integrations/supabase/client";
import { fmtGHS } from "@/lib/utils";

type TrackedOrder = {
  id: string;
  customer_phone: string;
  network: string | null;
  package_size: string | null;
  amount: number;
  status: "completed" | "pending" | "processing" | "failed";
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

function statusHint(status: TrackedOrder["status"]) {
  switch (status) {
    case "completed":
      return "Data delivered / marked complete";
    case "processing":
      return "Order is being processed";
    case "pending":
      return "Waiting in queue";
    case "failed":
      return "Delivery failed";
    default:
      return "";
  }
}

export function TrackOrderPage() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);

  const track = async () => {
    const cleaned = normalizeGhanaPhone(phone);
    if (!cleaned) {
      toast.error("Enter a valid Ghana number (10 digits starting with 0).");
      return;
    }
    setBusy(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.rpc("track_orders_by_phone", {
        _phone: cleaned,
      });
      if (error) throw error;
      setOrders((data as TrackedOrder[]) ?? []);
      if (!data || (Array.isArray(data) && data.length === 0)) {
        toast("No orders found for that number.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Track failed");
      setOrders([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Track order</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter a customer phone number to see delivery status for orders you placed.
        </p>
      </div>

      <GlassCard variant="strong" className="max-w-xl space-y-4">
        <div>
          <Label htmlFor="trackPhone">Phone number</Label>
          <Input
            id="trackPhone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="024XXXXXXX"
            onKeyDown={(e) => {
              if (e.key === "Enter") void track();
            }}
          />
        </div>
        <Button variant="hero" disabled={busy} onClick={() => void track()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Track
        </Button>
      </GlassCard>

      {searched ? (
        <GlassCard variant="strong">
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No delivery records for this number under your account.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-lg border border-border/60 px-3 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {o.network} {o.package_size} · {o.customer_phone}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Ordered {new Date(o.created_at).toLocaleString()}
                      {o.updated_at !== o.created_at
                        ? ` · Updated ${new Date(o.updated_at).toLocaleString()}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{statusHint(o.status)}</p>
                    {o.status === "failed" && o.failure_reason ? (
                      <p className="mt-1 text-xs text-destructive">{o.failure_reason}</p>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center gap-3 sm:mt-0 sm:flex-col sm:items-end">
                    <StatusBadge status={o.status} />
                    <span className="text-sm font-semibold text-primary">{fmtGHS(Number(o.amount))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      ) : null}
    </div>
  );
}
