import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, extractApiKey, json, rpcErrorMessage, supabaseApi } from "@/lib/api-v1";

export const Route = createFileRoute("/api/v1/balance")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request }) => {
        const key = extractApiKey(request);
        if (!key) return json({ error: "Missing API key" }, 401);
        const { data, error } = await supabaseApi().rpc("api_get_balance", { _raw_key: key });
        if (error) return json({ error: rpcErrorMessage(error) }, 401);
        return json(data);
      },
    },
  },
});
