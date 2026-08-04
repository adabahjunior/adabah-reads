import { GlassCard } from "@/components/GlassCard";

const BASE = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

export function ApiDocsPage() {
  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">API Documentation</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Authenticate with a Bearer token from API Access. Base URL:{" "}
          <code className="text-primary">{BASE}</code>
        </p>
      </div>

      <GlassCard variant="strong" className="space-y-3">
        <h3 className="font-heading text-sm font-semibold text-foreground">Authentication</h3>
        <p className="text-sm text-muted-foreground">Send your API key on every request:</p>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs text-foreground">{`Authorization: Bearer bm_live_••••••••
# or
X-API-Key: bm_live_••••••••`}</pre>
      </GlassCard>

      <GlassCard variant="strong" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
            GET
          </span>
          <code className="font-mono text-sm text-foreground">/api/v1/balance</code>
        </div>
        <p className="text-sm text-muted-foreground">Return your wallet balance in GHS.</p>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs text-foreground">{`curl "${BASE}/api/v1/balance" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
      </GlassCard>

      <GlassCard variant="strong" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
            GET
          </span>
          <code className="font-mono text-sm text-foreground">/api/v1/packages</code>
        </div>
        <p className="text-sm text-muted-foreground">
          List available MTN, Telecel, and AirtelTigo bundles. Prices include your Data Packages
          markup (<code className="text-foreground">sell_price</code> = admin base + your profit).
        </p>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs text-foreground">{`curl "${BASE}/api/v1/packages" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
      </GlassCard>

      <GlassCard variant="strong" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
            POST
          </span>
          <code className="font-mono text-sm text-foreground">/api/v1/orders</code>
        </div>
        <p className="text-sm text-muted-foreground">
          Purchase a bundle for a Ghana phone number. Debits your wallet.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs text-foreground">{`curl -X POST "${BASE}/api/v1/orders" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"024XXXXXXX","network":"MTN","package_size":"1GB"}'`}</pre>
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Body
        </p>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs text-foreground">{`{
  "phone": "024XXXXXXX",
  "network": "MTN",
  "package_size": "1GB"
}`}</pre>
      </GlassCard>

      <GlassCard variant="strong" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
            GET
          </span>
          <code className="font-mono text-sm text-foreground">/api/v1/orders?limit=20</code>
        </div>
        <p className="text-sm text-muted-foreground">List your recent orders (max 100).</p>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs text-foreground">{`curl "${BASE}/api/v1/orders?limit=20" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
      </GlassCard>

      <GlassCard variant="strong" className="space-y-2">
        <h3 className="font-heading text-sm font-semibold text-foreground">Networks &amp; sizes</h3>
        <p className="text-sm text-muted-foreground">
          <code className="text-foreground">network</code> must be one of{" "}
          <code className="text-primary">MTN</code>, <code className="text-primary">Telecel</code>,{" "}
          <code className="text-primary">AirtelTigo</code>. Use exact{" "}
          <code className="text-foreground">package_size</code> values from packages (e.g.{" "}
          <code className="text-foreground">1GB</code>). Phone numbers must be 10 digits starting
          with <code className="text-foreground">0</code>.
        </p>
      </GlassCard>

      <GlassCard variant="strong" className="space-y-2">
        <h3 className="font-heading text-sm font-semibold text-foreground">Errors</h3>
        <p className="text-sm text-muted-foreground">
          Failed requests return JSON like{" "}
          <code className="text-foreground">{`{ "error": "message" }`}</code> with HTTP 4xx/5xx.
          Common cases: invalid key (401), insufficient balance (400), package unavailable (400).
        </p>
      </GlassCard>
    </div>
  );
}
