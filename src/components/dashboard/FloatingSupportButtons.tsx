import { useEffect, useMemo, useState } from "react";
import { Headphones, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SupportLinks = {
  channel: string;
  whatsappNumber: string;
};

function toWhatsAppMe(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Ghana local 0XXXXXXXXX → 233XXXXXXXXX
  const international =
    digits.startsWith("233") && digits.length >= 12
      ? digits
      : digits.startsWith("0") && digits.length === 10
        ? `233${digits.slice(1)}`
        : digits;
  return `https://wa.me/${international}`;
}

export function FloatingSupportButtons() {
  const [links, setLinks] = useState<SupportLinks>({ channel: "", whatsappNumber: "" });

  useEffect(() => {
    void supabase
      .from("system_settings")
      .select("support_channel_link, support_whatsapp_number, customer_service_number")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setLinks({
          channel: (data.support_channel_link as string) || "",
          whatsappNumber:
            (data.support_whatsapp_number as string) ||
            (data.customer_service_number as string) ||
            "",
        });
      });
  }, []);

  const channelHref = useMemo(() => {
    const url = links.channel.trim();
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  }, [links.channel]);

  const adminHref = useMemo(() => toWhatsAppMe(links.whatsappNumber), [links.whatsappNumber]);

  if (!channelHref && !adminHref) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-5 z-50 flex flex-col items-end gap-3 sm:right-6">
      {channelHref ? (
        <a
          href={channelHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "pointer-events-auto group flex items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-3 text-white shadow-lg shadow-black/30",
            "transition-transform hover:scale-105 active:scale-95",
          )}
          title="Join support WhatsApp channel"
        >
          <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold opacity-0 transition-all group-hover:max-w-[10rem] group-hover:opacity-100 sm:inline">
            Support channel
          </span>
          <MessageCircle className="h-5 w-5" />
        </a>
      ) : null}

      {adminHref ? (
        <a
          href={adminHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "pointer-events-auto group flex items-center gap-2 rounded-full bg-primary px-3.5 py-3 text-primary-foreground shadow-lg shadow-primary/30",
            "transition-transform hover:scale-105 active:scale-95",
          )}
          title="Contact admin on WhatsApp"
        >
          <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold opacity-0 transition-all group-hover:max-w-[10rem] group-hover:opacity-100 sm:inline">
            Contact admin
          </span>
          <Headphones className="h-5 w-5" />
        </a>
      ) : null}
    </div>
  );
}
