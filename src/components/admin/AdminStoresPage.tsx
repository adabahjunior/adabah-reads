import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";

type Store = {
  id: string;
  store_name: string;
  support_phone: string;
  is_published: boolean;
  whatsapp_link: string;
  reseller_id: string;
};

export function AdminStoresPage() {
  const [rows, setRows] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase
      .from("reseller_stores")
      .select("id, store_name, support_phone, is_published, whatsapp_link, reseller_id")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as Store[]) ?? []);
        setLoading(false);
      });
  }, []);

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
        <h2 className="font-heading text-xl font-bold text-foreground">Stores</h2>
        <p className="mt-1 text-xs text-muted-foreground">Published and draft reseller storefronts.</p>
      </div>
      <GlassCard variant="strong">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No stores yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.store_name || "Untitled store"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.support_phone || "—"} · {s.whatsapp_link || "no WhatsApp"}
                  </p>
                </div>
                <span
                  className={
                    s.is_published
                      ? "text-[11px] font-semibold text-success"
                      : "text-[11px] text-muted-foreground"
                  }
                >
                  {s.is_published ? "Published" : "Draft"}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
