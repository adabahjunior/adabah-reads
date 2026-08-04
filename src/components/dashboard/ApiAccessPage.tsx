import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export function ApiAccessPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("Production");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [showFresh, setShowFresh] = useState(true);

  const reload = async () => {
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setKeys((data as ApiKeyRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const createKey = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_api_key", {
        _name: name.trim() || "Default",
      });
      if (error) throw error;
      const payload = data as { api_key?: string };
      if (!payload?.api_key) throw new Error("No key returned");
      setFreshKey(payload.api_key);
      setShowFresh(true);
      toast.success("API key created — copy it now, it won’t be shown again.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create key");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("revoke_api_key", { _key_id: id });
      if (error) throw error;
      toast.success("API key revoked");
      if (freshKey) setFreshKey(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
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
        <h2 className="font-heading text-xl font-bold text-foreground">API Access</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Generate keys to buy data programmatically. Keep keys secret — treat them like passwords.
        </p>
      </div>

      {freshKey ? (
        <GlassCard variant="yellow" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider">New key (shown once)</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded-md bg-background/40 px-3 py-2 font-mono text-sm">
              {showFresh ? freshKey : "•".repeat(Math.min(freshKey.length, 40))}
            </code>
            <Button size="sm" variant="outline" onClick={() => setShowFresh((v) => !v)}>
              {showFresh ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="hero" onClick={() => void copy(freshKey)}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
        </GlassCard>
      ) : null}

      <GlassCard variant="strong" className="space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Create API key</h3>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Label htmlFor="keyName">Label</Label>
            <Input
              id="keyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production"
            />
          </div>
          <Button variant="hero" disabled={busy} onClick={() => void createKey()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Generate key
          </Button>
        </div>
      </GlassCard>

      <GlassCard variant="strong">
        <h3 className="font-heading mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Active keys
        </h3>
        {keys.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{k.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {k.key_prefix}•••••••• · created {new Date(k.created_at).toLocaleString()}
                    {k.last_used_at
                      ? ` · last used ${new Date(k.last_used_at).toLocaleString()}`
                      : " · never used"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void revoke(k.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
