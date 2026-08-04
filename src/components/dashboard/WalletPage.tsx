import { useEffect, useState } from "react";
import { Copy, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fmtGHS } from "@/lib/utils";

type Tx = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
};

export function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [profit, setProfit] = useState(0);
  const [topupCode, setTopupCode] = useState<string | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [w, t, p] = await Promise.all([
        supabase.from("wallets").select("balance, total_profit").eq("reseller_id", user.id).maybeSingle(),
        supabase
          .from("wallet_transactions")
          .select("id, type, amount, description, created_at")
          .eq("reseller_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("profiles").select("topup_code").eq("id", user.id).maybeSingle(),
      ]);
      setBalance(Number(w.data?.balance ?? 0));
      setProfit(Number(w.data?.total_profit ?? 0));
      setTxs((t.data as Tx[]) ?? []);
      setTopupCode(p.data?.topup_code ?? null);
      setLoading(false);
    })();
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
        <h2 className="font-heading text-xl font-bold text-foreground">Wallet</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Top-ups are credited by admin only — share your 4-digit code after you pay.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <GlassCard variant="strong" className="flex items-center justify-between sm:col-span-1">
          <div>
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="font-heading mt-1 text-3xl font-bold text-primary">{fmtGHS(balance)}</p>
          </div>
          <Wallet className="h-8 w-8 text-primary/60" />
        </GlassCard>
        <GlassCard variant="dark">
          <p className="text-xs text-white/60">Withdrawable Profit</p>
          <p className="font-heading mt-1 text-3xl font-bold text-[oklch(0.78_0.16_85)]">{fmtGHS(profit)}</p>
        </GlassCard>
        <GlassCard variant="yellow" className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Your top-up code</p>
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-3xl font-bold tracking-[0.25em]">{topupCode || "————"}</p>
            {topupCode ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(topupCode);
                  toast.success("Code copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] opacity-70">Give this code to admin when funding your wallet.</p>
        </GlassCard>
      </div>

      <GlassCard variant="strong">
        <h3 className="font-heading mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Recent transactions
        </h3>
        {txs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
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
                  className={`text-sm font-semibold ${Number(tx.amount) < 0 ? "text-destructive" : "text-success"}`}
                >
                  {Number(tx.amount) > 0 ? "+" : ""}
                  {fmtGHS(Number(tx.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
