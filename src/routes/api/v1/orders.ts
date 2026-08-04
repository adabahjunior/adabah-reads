import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, extractApiKey, json, rpcErrorMessage, supabaseApi } from "@/lib/api-v1";

export const Route = createFileRoute("/api/v1/orders")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request }) => {
        const key = extractApiKey(request);
        if (!key) return json({ error: "Missing API key" }, 401);
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get("limit") ?? 20);
        const { data, error } = await supabaseApi().rpc("api_list_orders", {
          _raw_key: key,
          _limit: Number.isFinite(limit) ? limit : 20,
        });
        if (error) return json({ error: rpcErrorMessage(error) }, 401);
        return json(data);
      },
      POST: async ({ request }) => {
        const key = extractApiKey(request);
        if (!key) return json({ error: "Missing API key" }, 401);
        let body: { phone?: string; network?: string; package_size?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        if (!body.phone || !body.network || !body.package_size) {
          return json({ error: "phone, network, and package_size are required" }, 400);
        }
        const { data, error } = await supabaseApi().rpc("api_place_order", {
          _raw_key: key,
          _phone: body.phone,
          _network: body.network,
          _package_size: body.package_size,
        });
        if (error) {
          const msg = rpcErrorMessage(error);
          const status = msg.toLowerCase().includes("invalid api key") ? 401 : 400;
          return json({ error: msg }, status);
        }
        return json(data, 201);
      },
    },
  },
});
