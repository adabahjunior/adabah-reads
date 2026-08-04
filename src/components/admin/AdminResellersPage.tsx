import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fmtGHS } from "@/lib/utils";

type ResellerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  topup_code: string | null;
  balance: number;
  total_profit: number;
  roles: string[];
};

export function AdminResellersPage() {
  const [rows, setRows] = useState<ResellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    const [profiles, wallets, roles] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, topup_code")
        .order("created_at", { ascending: false }),
      supabase.from("wallets").select("reseller_id, balance, total_profit"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const walletMap = new Map(
      (wallets.data ?? []).map((w) => [
        w.reseller_id,
        { balance: Number(w.balance), profit: Number(w.total_profit) },
      ]),
    );
    const roleMap = new Map<string, string[]>();
    for (const r of roles.data ?? []) {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role);
      roleMap.set(r.user_id, list);
    }

    setRows(
      (profiles.data ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
        topup_code: p.topup_code ?? null,
        balance: walletMap.get(p.id)?.balance ?? 0,
        total_profit: walletMap.get(p.id)?.profit ?? 0,
        roles: roleMap.get(p.id) ?? [],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        r.phone.includes(term) ||
        (r.topup_code ?? "").includes(term),
    );
  }, [rows, q]);

  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    setBusyId(userId);
    try {
      const { error } = makeAdmin
        ? await supabase.rpc("assign_user_role", { _user_id: userId, _role: "admin" })
        : await supabase.rpc("remove_user_role", { _user_id: userId, _role: "admin" });
      if (error) throw error;
      toast.success(makeAdmin ? "Admin role granted" : "Admin role removed");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Role update failed");
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
        <h2 className="font-heading text-xl font-bold text-foreground">Resellers</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tap a user to open their full account. Top-ups use the 4-digit code on the Top-ups page.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, email, phone, or code…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <GlassCard variant="strong" className="py-10 text-center text-sm text-muted-foreground">
            No users found.
          </GlassCard>
        ) : (
          filtered.map((r) => (
            <GlassCard key={r.id} variant="strong" className="space-y-3">
              <Link
                to="/admin/resellers/$userId"
                params={{ userId: r.id }}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg transition-colors hover:bg-muted/30"
              >
                <div>
                  <p className="font-heading text-sm font-semibold text-foreground">
                    {r.full_name || "Unnamed"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.email} · {r.phone || "no phone"}
                  </p>
                  <p className="mt-1 font-mono text-sm text-primary">
                    Code {r.topup_code || "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Roles: {r.roles.join(", ") || "none"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right text-xs">
                  <div>
                    <p className="text-muted-foreground">Balance</p>
                    <p className="font-heading text-lg font-bold text-primary">{fmtGHS(r.balance)}</p>
                    <p className="text-muted-foreground">Profit {fmtGHS(r.total_profit)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
              <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
                {r.roles.includes("admin") ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === r.id}
                    onClick={() => void toggleAdmin(r.id, false)}
                  >
                    Remove admin
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === r.id}
                    onClick={() => void toggleAdmin(r.id, true)}
                  >
                    Make admin
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link to="/admin/topups">Top up by code</Link>
                </Button>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
