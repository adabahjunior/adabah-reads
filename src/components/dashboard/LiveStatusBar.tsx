import { useEffect, useState } from "react";
import { Activity, Clock, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type DeliveryStatus = {
  last_order_at: string | null;
  estimated_delivery_minutes: number;
};

function formatClock(date: Date) {
  return date.toLocaleTimeString("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function LiveStatusBar() {
  const [status, setStatus] = useState<DeliveryStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pulse, setPulse] = useState(true);

  const load = async () => {
    const { data, error } = await supabase.rpc("get_delivery_status");
    if (error || !data) return;
    const payload = data as {
      last_order_at?: string | null;
      estimated_delivery_minutes?: number;
    };
    setStatus({
      last_order_at: payload.last_order_at ?? null,
      estimated_delivery_minutes: Number(payload.estimated_delivery_minutes ?? 15),
    });
  };

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 15000);
    const tick = setInterval(() => {
      setNow(Date.now());
      setPulse((p) => !p);
    }, 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const lastAt = status?.last_order_at ? new Date(status.last_order_at) : null;
  const sinceMs = lastAt ? now - lastAt.getTime() : null;
  const etaMin = status?.estimated_delivery_minutes ?? 15;

  return (
    <div className="border-b border-border/70 bg-card/60 px-4 py-2.5 backdrop-blur-xl sm:px-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full bg-success transition-opacity",
              pulse ? "opacity-100" : "opacity-40",
            )}
          />
          <span className="font-heading font-semibold tracking-wider text-foreground uppercase">
            Live status
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Timer className="h-3.5 w-3.5 text-primary" />
          <span>Est. delivery</span>
          <span className="font-semibold text-foreground">~{etaMin} min</span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span>Last order</span>
          <span className="font-semibold text-foreground">
            {lastAt ? formatClock(lastAt) : "No orders yet"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>Since last</span>
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {sinceMs == null ? "—" : formatDuration(sinceMs)}
          </span>
        </div>
      </div>
    </div>
  );
}
