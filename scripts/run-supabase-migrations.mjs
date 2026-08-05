import fs from "node:fs";
import https from "node:https";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || "wpsfzixglighzdcyzajj";

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const files = [
  "db/bundlemart-migration.sql",
  "db/bundlemart-api-keys.sql",
  "db/bundlemart-live-status.sql",
  "db/bundlemart-topup-codes.sql",
  "db/bundlemart-rls-fix.sql",
  "db/bundlemart-reseller-packages.sql",
  "db/bundlemart-single-price.sql",
];

function postQuery(sql) {
  const body = JSON.stringify({ query: sql });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.supabase.com",
        path: `/v1/projects/${ref}/database/query`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, data }));
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

for (const file of files) {
  console.log(`=== RUN ${file} ===`);
  const sql = fs.readFileSync(file, "utf8");
  const res = await postQuery(sql);
  if (res.status >= 400) {
    console.error(`FAIL ${res.status}`, res.data.slice(0, 4000));
    process.exit(1);
  }
  console.log(`OK ${res.status}`, res.data.slice(0, 240));
}

console.log("=== VERIFY ===");
let res = await postQuery(
  "select proname from pg_proc where pronamespace = 'public'::regnamespace and proname in ('create_wallet_order','api_place_order','api_list_packages','api_get_balance') order by 1;",
);
console.log(res.status, res.data);
res = await postQuery(
  "select count(*)::int as packages, count(*) filter (where public_price = reseller_price)::int as synced from public.packages;",
);
console.log(res.status, res.data);
console.log("=== ALL DONE ===");
