import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../integrations/supabase/public-env";

function env(name: string): string {
  const fromImport =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.[name] as string | undefined)
      : undefined;
  return (fromImport || process.env[name] || "").trim();
}

const url = env("VITE_SUPABASE_URL") || env("SUPABASE_URL") || SUPABASE_URL;
const anon =
  env("VITE_SUPABASE_ANON_KEY") ||
  env("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  env("SUPABASE_ANON_KEY") ||
  SUPABASE_PUBLISHABLE_KEY;

/** Server-side anon client used only to call security-definer API RPCs. */
export function supabaseApi() {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function extractApiKey(request: Request): string | null {
  const header = request.headers.get("x-api-key");
  if (header?.trim()) return header.trim();
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return null;
}

export function json(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Authorization, Content-Type, X-API-Key",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      ...extraHeaders,
    },
  });
}

export function corsPreflight() {
  return json({}, 204);
}

export function rpcErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message);
  }
  return "Request failed";
}
