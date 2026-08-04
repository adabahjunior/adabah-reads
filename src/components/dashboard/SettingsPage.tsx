import { useEffect, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function SettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [topupCode, setTopupCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("full_name, phone, topup_code")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? "");
        setPhone(data?.phone ?? "");
        setTopupCode(data?.topup_code ?? "");
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
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
        <h2 className="font-heading text-xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-xs text-muted-foreground">{user?.email}</p>
      </div>

      <GlassCard variant="yellow" className="max-w-lg space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Top-up code</p>
        <div className="flex items-center gap-3">
          <p className="font-mono text-3xl font-bold tracking-[0.25em]">{topupCode || "————"}</p>
          {topupCode ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(topupCode);
                toast.success("Copied");
              }}
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] opacity-70">Permanent code used by admin to credit your wallet.</p>
      </GlassCard>

      <GlassCard variant="strong" className="max-w-lg space-y-3">
        <div>
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Button variant="hero" disabled={busy} onClick={() => void save()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </GlassCard>
    </div>
  );
}
