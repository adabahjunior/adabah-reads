import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/public-env";

const url = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.trim() || SUPABASE_URL;
const key =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined)?.trim() ||
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined)?.trim() ||
  SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type AppRole = "admin" | "reseller" | "user";
