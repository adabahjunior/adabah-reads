import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Play,
  RefreshCw,
  Terminal,
  Wallet,
  Package,
  ShoppingCart,
  ListOrdered,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { detectNetwork, normalizeGhanaPhone, type Network } from "@/lib/ghana-phone";
import { cn, fmtGHS } from "@/lib/utils";

const KEY_STORAGE = "bundlemart_api_docs_key";

type EndpointId = "balance" | "packages" | "place-order" | "list-orders";

type ApiPackage = {
  network: string;
  package_size: string;
  sell_price?: number;
  reseller_price?: number;
  base_price?: number;
  profit?: number;
  validity?: string;
};

type PlayResult = {
  status: number;
  ok: boolean;
  ms: number;
  body: string;
};

const ENDPOINTS: {
  id: EndpointId;
  method: "GET" | "POST";
  path: string;
  title: string;
  blurb: string;
  icon: typeof Wallet;
}[] = [
  {
    id: "balance",
    method: "GET",
    path: "/api/v1/balance",
    title: "Wallet balance",
    blurb: "Check available GHS balance before you sell.",
    icon: Wallet,
  },
  {
    id: "packages",
    method: "GET",
    path: "/api/v1/packages",
    title: "List packages",
    blurb: "MTN, Telecel & AirtelTigo bundles with your sell prices.",
    icon: Package,
  },
  {
    id: "place-order",
    method: "POST",
    path: "/api/v1/orders",
    title: "Place order",
    blurb: "Buy a bundle for a Ghana number — debits your wallet.",
    icon: ShoppingCart,
  },
  {
    id: "list-orders",
    method: "GET",
    path: "/api/v1/orders",
    title: "List orders",
    blurb: "Pull your latest API and dashboard orders.",
    icon: ListOrdered,
  },
];

function baseUrl() {
  return typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
}

function pretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function packagePrice(pkg: ApiPackage) {
  return Number(pkg.sell_price ?? pkg.reseller_price ?? pkg.base_price ?? 0);
}

export function ApiDocsPage() {
  const [active, setActive] = useState<EndpointId>("place-order");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState<Network | "">("");
  const [packageSize, setPackageSize] = useState("");
  const [limit, setLimit] = useState("20");
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY_STORAGE);
      if (saved) setApiKey(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (apiKey.trim()) sessionStorage.setItem(KEY_STORAGE, apiKey.trim());
      else sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
  }, [apiKey]);

  useEffect(() => {
    const n = detectNetwork(phone);
    if (n) setNetwork(n);
  }, [phone]);

  const endpoint = ENDPOINTS.find((e) => e.id === active) ?? ENDPOINTS[0]!;
  const origin = baseUrl();

  const networkPackages = useMemo(
    () => packages.filter((p) => !network || p.network === network),
    [packages, network],
  );

  const sizes = useMemo(() => {
    const set = new Set(networkPackages.map((p) => p.package_size));
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [networkPackages]);

  const selectedPkg = useMemo(
    () => packages.find((p) => p.network === network && p.package_size === packageSize) ?? null,
    [packages, network, packageSize],
  );

  const requestPreview = useMemo(() => {
    const key = apiKey.trim() || "YOUR_API_KEY";
    if (active === "balance") {
      return `curl "${origin}/api/v1/balance" \\\n  -H "Authorization: Bearer ${key}"`;
    }
    if (active === "packages") {
      return `curl "${origin}/api/v1/packages" \\\n  -H "Authorization: Bearer ${key}"`;
    }
    if (active === "list-orders") {
      const lim = Number(limit) || 20;
      return `curl "${origin}/api/v1/orders?limit=${lim}" \\\n  -H "Authorization: Bearer ${key}"`;
    }
    const body = {
      phone: normalizeGhanaPhone(phone) || phone || "024XXXXXXX",
      network: network || "MTN",
      package_size: packageSize || "1GB",
    };
    return `curl -X POST "${origin}/api/v1/orders" \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`;
  }, [active, apiKey, origin, phone, network, packageSize, limit]);

  const callApi = useCallback(
    async (path: string, init?: RequestInit): Promise<PlayResult> => {
      const key = apiKey.trim();
      if (!key) throw new Error("Paste an API key from API Access first.");
      const started = performance.now();
      const res = await fetch(path, {
        ...init,
        headers: {
          Authorization: `Bearer ${key}`,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
      });
      const text = await res.text();
      let body = text;
      try {
        body = pretty(JSON.parse(text));
      } catch {
        /* keep raw */
      }
      return {
        status: res.status,
        ok: res.ok,
        ms: Math.round(performance.now() - started),
        body,
      };
    },
    [apiKey],
  );

  const loadPackages = useCallback(async () => {
    if (!apiKey.trim()) {
      setPackages([]);
      return;
    }
    setPackagesLoading(true);
    try {
      const res = await callApi("/api/v1/packages");
      if (!res.ok) throw new Error(res.body);
      const data = JSON.parse(res.body) as ApiPackage[];
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) {
      setPackages([]);
      toast.error(err instanceof Error ? err.message : "Could not load packages");
    } finally {
      setPackagesLoading(false);
    }
  }, [apiKey, callApi]);

  useEffect(() => {
    if (active === "place-order" && apiKey.trim()) void loadPackages();
  }, [active, apiKey, loadPackages]);

  const send = async () => {
    setBusy(true);
    setResult(null);
    try {
      let play: PlayResult;
      if (active === "balance") {
        play = await callApi("/api/v1/balance");
      } else if (active === "packages") {
        play = await callApi("/api/v1/packages");
        if (play.ok) {
          try {
            const data = JSON.parse(play.body) as ApiPackage[];
            if (Array.isArray(data)) setPackages(data);
          } catch {
            /* ignore */
          }
        }
      } else if (active === "list-orders") {
        const lim = Math.min(100, Math.max(1, Number(limit) || 20));
        play = await callApi(`/api/v1/orders?limit=${lim}`);
      } else {
        const normalized = normalizeGhanaPhone(phone);
        if (!normalized) throw new Error("Enter a valid Ghana phone (10 digits starting with 0).");
        if (!network) throw new Error("Select a network.");
        if (!packageSize) throw new Error("Select a package size.");
        play = await callApi("/api/v1/orders", {
          method: "POST",
          body: JSON.stringify({
            phone: normalized,
            network,
            package_size: packageSize,
          }),
        });
        if (play.ok) toast.success("Order placed via API");
      }
      setResult(play);
      if (!play.ok) {
        try {
          const err = JSON.parse(play.body) as { error?: string };
          toast.error(err.error || `Request failed (${play.status})`);
        } catch {
          toast.error(`Request failed (${play.status})`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const copyCurl = async () => {
    await navigator.clipboard.writeText(requestPreview);
    setCopied(true);
    toast.success("cURL copied");
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
              <BookOpen className="h-3.5 w-3.5" />
              Live API playground
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              BundleMart API
            </h2>
            <p className="text-sm text-muted-foreground">
              Paste a key, try endpoints live, and place real orders against{" "}
              <code className="text-primary">{origin}</code>.
            </p>
          </div>
          <Link
            to="/dashboard/api"
            className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-background/50 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Manage API keys
          </Link>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label htmlFor="docsApiKey" className="mb-1.5 text-[11px] tracking-wider uppercase">
              API key
            </Label>
            <div className="relative">
              <Input
                id="docsApiKey"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="bm_live_…"
                className="h-11 pr-20 font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:w-auto"
              disabled={!apiKey.trim() || packagesLoading}
              onClick={() => void loadPackages()}
            >
              {packagesLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync packages
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <GlassCard variant="strong" className="h-fit space-y-1 !p-3">
          <p className="px-2 pb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Endpoints
          </p>
          {ENDPOINTS.map((ep) => {
            const Icon = ep.icon;
            const selected = active === ep.id;
            return (
              <button
                key={ep.id}
                type="button"
                onClick={() => {
                  setActive(ep.id);
                  setResult(null);
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                  selected
                    ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", selected && "text-primary")} />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
                        ep.method === "GET"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-primary/20 text-primary",
                      )}
                    >
                      {ep.method}
                    </span>
                    <span className="truncate text-xs font-semibold">{ep.title}</span>
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] opacity-70">
                    {ep.path}
                  </span>
                </span>
              </button>
            );
          })}
        </GlassCard>

        <div className="space-y-4">
          <GlassCard variant="strong" className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 font-mono text-[11px] font-bold",
                      endpoint.method === "GET"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-primary/20 text-primary",
                    )}
                  >
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-sm text-foreground">{endpoint.path}</code>
                </div>
                <p className="text-sm text-muted-foreground">{endpoint.blurb}</p>
              </div>
              <Button variant="hero" disabled={busy} onClick={() => void send()} className="shrink-0">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {active === "place-order" ? "Place order" : "Send request"}
              </Button>
            </div>

            {active === "place-order" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="orderPhone">Customer phone</Label>
                  <Input
                    id="orderPhone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="024XXXXXXX"
                    className="mt-1.5 h-11 font-mono"
                    inputMode="tel"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Network auto-detects from Ghana prefixes.
                  </p>
                </div>
                <div>
                  <Label htmlFor="orderNetwork">Network</Label>
                  <select
                    id="orderNetwork"
                    value={network}
                    onChange={(e) => {
                      setNetwork(e.target.value as Network | "");
                      setPackageSize("");
                    }}
                    className="mt-1.5 flex h-11 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <option value="">Select network</option>
                    <option value="MTN">MTN</option>
                    <option value="Telecel">Telecel</option>
                    <option value="AirtelTigo">AirtelTigo</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="orderSize">Package size</Label>
                  <select
                    id="orderSize"
                    value={packageSize}
                    onChange={(e) => setPackageSize(e.target.value)}
                    disabled={!network || packagesLoading}
                    className="mt-1.5 flex h-11 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                  >
                    <option value="">
                      {packagesLoading
                        ? "Loading…"
                        : sizes.length
                          ? "Select size"
                          : apiKey.trim()
                            ? "No packages for network"
                            : "Add API key to load"}
                    </option>
                    {sizes.map((size) => {
                      const pkg = packages.find((p) => p.network === network && p.package_size === size);
                      const price = pkg ? packagePrice(pkg) : 0;
                      return (
                        <option key={size} value={size}>
                          {size}
                          {price ? ` · ${fmtGHS(price)}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {selectedPkg ? (
                  <div className="sm:col-span-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
                    <p className="font-medium text-foreground">
                      {selectedPkg.network} {selectedPkg.package_size}
                      {selectedPkg.validity ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          · {selectedPkg.validity}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sell price:{" "}
                      <span className="font-semibold text-primary">
                        {fmtGHS(packagePrice(selectedPkg))}
                      </span>
                      {typeof selectedPkg.base_price === "number" ? (
                        <> · wallet cost {fmtGHS(Number(selectedPkg.base_price))}</>
                      ) : null}
                      {typeof selectedPkg.profit === "number" && selectedPkg.profit > 0 ? (
                        <> · profit {fmtGHS(selectedPkg.profit)}</>
                      ) : null}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {active === "list-orders" ? (
              <div className="max-w-xs">
                <Label htmlFor="orderLimit">Limit (1–100)</Label>
                <Input
                  id="orderLimit"
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>
            ) : null}

            {(active === "balance" || active === "packages") && (
              <p className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                No request body required. Hit <span className="text-foreground">Send request</span>{" "}
                to call this endpoint with your API key.
              </p>
            )}
          </GlassCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <GlassCard variant="strong" className="space-y-3 !p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <Terminal className="h-3.5 w-3.5 text-primary" />
                  cURL
                </div>
                <Button size="sm" variant="outline" onClick={() => void copyCurl()}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </Button>
              </div>
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">
                {requestPreview}
              </pre>
            </GlassCard>

            <GlassCard variant="strong" className="space-y-3 !p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Response
                </p>
                {result ? (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 font-mono font-bold",
                        result.ok
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {result.status}
                    </span>
                    <span className="text-muted-foreground">{result.ms} ms</span>
                  </div>
                ) : null}
              </div>
              <pre
                className={cn(
                  "min-h-[10rem] max-h-64 overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap",
                  result?.ok === false ? "text-destructive" : "text-foreground",
                )}
              >
                {result?.body ??
                  "// Response appears here after you send a request.\n// Place Order will create a real wallet debit."}
              </pre>
            </GlassCard>
          </div>

          <GlassCard variant="strong" className="space-y-3 !p-4">
            <h3 className="font-heading text-sm font-semibold text-foreground">Quick reference</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                Auth header:{" "}
                <code className="text-foreground">Authorization: Bearer bm_live_…</code> or{" "}
                <code className="text-foreground">X-API-Key</code>
              </li>
              <li>
                Networks: <code className="text-primary">MTN</code>,{" "}
                <code className="text-primary">Telecel</code>,{" "}
                <code className="text-primary">AirtelTigo</code>
              </li>
              <li>
                Phone: 10 digits starting with <code className="text-foreground">0</code> (local
                Ghana format)
              </li>
              <li>
                Errors return <code className="text-foreground">{`{ "error": "…" }`}</code> with
                4xx/5xx — common: invalid key, low balance, package unavailable
              </li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
