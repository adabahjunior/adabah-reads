import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmtGHS } from "@/lib/utils";

type Withdrawal = {
  id: string;
  reseller_id: string;
  amount: number;
  momo_number: string;
  momo_network: string;
  momo_name: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
};

export function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    const { data } = await supabase
      .from("withdrawals")
      .select("id, reseller_id, amount, momo_number, momo_network, momo_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(80);
    setRows((data as Withdrawal[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("admin_complete_withdrawal", {
        _withdrawal_id: id,
        _approve: approve,
        _reason: approve ? "" : "Rejected by admin",
      });
      if (error) throw error;
      toast.success(approve ? "Withdrawal approved" : "Withdrawal rejected");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
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
        <h2 className="font-heading text-xl font-bold text-foreground">Withdrawals</h2>
        <p className="mt-1 text-xs text-muted-foreground">Pay MoMo and mark requests complete.</p>
      </div>

      <GlassCard variant="strong">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No withdrawals yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {fmtGHS(Number(w.amount))} · {w.momo_network} {w.momo_number}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {w.momo_name || "—"} · {new Date(w.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={w.status} />
                  {w.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        variant="hero"
                        disabled={busyId === w.id}
                        onClick={() => void decide(w.id, true)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === w.id}
                        onClick={() => void decide(w.id, false)}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
