import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fmtGHS } from "@/lib/utils";

type FoundUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  topup_code: string;
  balance: number;
  total_profit: number;
};

export function AdminTopupsPage() {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [found, setFound] = useState<FoundUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    setSearching(true);
    setFound(null);
    try {
      const { data, error } = await supabase.rpc("admin_find_by_topup_code", {
        _code: code.trim(),
      });
      if (error) throw error;
      setFound(data as FoundUser);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "User not found");
    } finally {
      setSearching(false);
    }
  };

  const adjust = async (direction: "credit" | "debit") => {
    if (!found) return;
    const value = Math.abs(Number(amount));
    if (!value || value <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    const signed = direction === "credit" ? value : -value;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_adjust_wallet", {
        _reseller_id: found.id,
        _amount: signed,
        _note:
          note.trim() ||
          (direction === "credit"
            ? `Admin credit via code ${found.topup_code}`
            : `Admin debit via code ${found.topup_code}`),
      });
      if (error) throw error;
      toast.success(
        direction === "credit" ? `Credited ${fmtGHS(value)}` : `Debited ${fmtGHS(value)}`,
      );
      setAmount("");
      const { data } = await supabase.rpc("admin_find_by_topup_code", {
        _code: found.topup_code,
      });
      if (data) setFound(data as FoundUser);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Wallet top-ups</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Search a reseller by their unique 4-digit top-up code, then credit or debit their wallet.
        </p>
      </div>

      <GlassCard variant="strong" className="max-w-xl space-y-4">
        <div>
          <Label htmlFor="code">4-digit top-up code</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="e.g. 4821"
              className="font-mono text-lg tracking-[0.3em]"
              maxLength={4}
              onKeyDown={(e) => {
                if (e.key === "Enter") void search();
              }}
            />
            <Button variant="hero" disabled={searching || code.length < 4} onClick={() => void search()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Find
            </Button>
          </div>
        </div>
      </GlassCard>

      {found ? (
        <GlassCard variant="strong" className="max-w-xl space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-heading text-lg font-bold text-foreground">
                {found.full_name || "Unnamed"}
              </p>
              <p className="text-xs text-muted-foreground">
                {found.email} · {found.phone || "no phone"}
              </p>
              <p className="mt-2 font-mono text-sm text-primary">
                Code <span className="text-xl font-bold tracking-[0.25em]">{found.topup_code}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="font-heading text-2xl font-bold text-primary">{fmtGHS(Number(found.balance))}</p>
              <p className="text-[11px] text-muted-foreground">
                Profit {fmtGHS(Number(found.total_profit))}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="amt">Amount (GHS)</Label>
              <Input
                id="amt"
                type="number"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="MoMo ref…" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="hero" disabled={busy} onClick={() => void adjust("credit")}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Credit
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void adjust("debit")}>
              <Minus className="h-4 w-4" />
              Debit
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/admin/resellers/${found.id}`}>
                Open full account
              </Link>
            </Button>
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
