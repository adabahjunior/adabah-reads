import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client for the EXTERNAL Supabase project.
 *
 * Set these in the project env:
 *   VITE_SUPABASE_URL              = https://<ref>.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY  = <anon / publishable key>
 */
const url = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const key = (import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ??
  import.meta.env['VITE_SUPABASE_ANON_KEY']) as string | undefined;

export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient = createClient(
  url ?? "https://placeholder.supabase.co",
  key ?? "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
