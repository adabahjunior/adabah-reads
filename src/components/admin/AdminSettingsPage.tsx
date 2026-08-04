import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    disable_ordering: false,
    holiday_mode_enabled: false,
    holiday_message: "",
    customer_service_number: "",
    support_whatsapp_number: "",
    support_channel_link: "",
    estimated_delivery_minutes: 15,
  });

  useEffect(() => {
    void supabase
      .from("system_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            disable_ordering: Boolean(data.disable_ordering),
            holiday_mode_enabled: Boolean(data.holiday_mode_enabled),
            holiday_message: data.holiday_message ?? "",
            customer_service_number: data.customer_service_number ?? "",
            support_whatsapp_number:
              data.support_whatsapp_number || data.customer_service_number || "",
            support_channel_link: data.support_channel_link ?? "",
            estimated_delivery_minutes: Number(data.estimated_delivery_minutes ?? 15),
          });
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("system_settings").upsert({
        id: 1,
        disable_ordering: form.disable_ordering,
        holiday_mode_enabled: form.holiday_mode_enabled,
        holiday_message: form.holiday_message,
        customer_service_number: form.support_whatsapp_number || form.customer_service_number,
        support_whatsapp_number: form.support_whatsapp_number,
        support_channel_link: form.support_channel_link,
        estimated_delivery_minutes: Math.max(1, Number(form.estimated_delivery_minutes) || 15),
      });
      if (error) throw error;
      toast.success("Settings saved");
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
        <h2 className="font-heading text-xl font-bold text-foreground">System settings</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Delivery ETA, WhatsApp support, and ordering switches.
        </p>
      </div>

      <GlassCard variant="strong" className="max-w-xl space-y-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.disable_ordering}
            onChange={(e) => setForm((f) => ({ ...f, disable_ordering: e.target.checked }))}
          />
          Disable ordering
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.holiday_mode_enabled}
            onChange={(e) => setForm((f) => ({ ...f, holiday_mode_enabled: e.target.checked }))}
          />
          Holiday mode
        </label>
        <div>
          <Label>Holiday message</Label>
          <Input
            value={form.holiday_message}
            onChange={(e) => setForm((f) => ({ ...f, holiday_message: e.target.value }))}
          />
        </div>
        <div>
          <Label>Estimated delivery (minutes)</Label>
          <Input
            type="number"
            min={1}
            value={form.estimated_delivery_minutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, estimated_delivery_minutes: Number(e.target.value) }))
            }
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Shown live on the reseller dashboard status bar.
          </p>
        </div>
        <div>
          <Label>Support WhatsApp number (contact admin)</Label>
          <Input
            value={form.support_whatsapp_number}
            onChange={(e) => setForm((f) => ({ ...f, support_whatsapp_number: e.target.value }))}
            placeholder="024XXXXXXX or 23324XXXXXXX"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Powers the floating “Contact admin” WhatsApp button.
          </p>
        </div>
        <div>
          <Label>Support WhatsApp channel link</Label>
          <Input
            value={form.support_channel_link}
            onChange={(e) => setForm((f) => ({ ...f, support_channel_link: e.target.value }))}
            placeholder="https://chat.whatsapp.com/..."
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Powers the floating green “Support channel” button.
          </p>
        </div>
        <Button variant="hero" disabled={busy} onClick={() => void save()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
        </Button>
      </GlassCard>
    </div>
  );
}
