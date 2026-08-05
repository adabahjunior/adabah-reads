import { corsPreflight, extractApiKey, json, rpcErrorMessage, supabaseApi } from "../lib/api-v1";

export async function balance(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return corsPreflight();
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const key = extractApiKey(request);
  if (!key) return json({ error: "Missing API key" }, 401);
  const { data, error } = await supabaseApi().rpc("api_get_balance", { _raw_key: key });
  return error ? json({ error: rpcErrorMessage(error) }, 401) : json(data);
}

export async function packages(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return corsPreflight();
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const key = extractApiKey(request);
  if (!key) return json({ error: "Missing API key" }, 401);
  const { data, error } = await supabaseApi().rpc("api_list_packages", { _raw_key: key });
  return error ? json({ error: rpcErrorMessage(error) }, 401) : json(data);
}

export async function orders(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return corsPreflight();
  const key = extractApiKey(request);
  if (!key) return json({ error: "Missing API key" }, 401);

  if (request.method === "GET") {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
    const { data, error } = await supabaseApi().rpc("api_list_orders", {
      _raw_key: key,
      _limit: Number.isFinite(limit) ? limit : 20,
    });
    return error ? json({ error: rpcErrorMessage(error) }, 401) : json(data);
  }

  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
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
    const message = rpcErrorMessage(error);
    return json({ error: message }, message.toLowerCase().includes("invalid api key") ? 401 : 400);
  }
  return json(data, 201);
}
