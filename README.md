# BundleMart

Data reselling platform (SwiftData-style reseller dashboard) built as a Vite + React SPA with React Router.

## Local

```sh
npm i
npm run dev
```

Open http://localhost:8080 — starts on **Auth**, then **Reseller Dashboard** after login.

Demo account: `reseller@bundlemart.gh` / `demo1234`

## Deploy to Vercel

Connect the repo in Vercel with build command `npm run build`. `vercel.json` rewrites non-API routes to the SPA entry point, while `/api/v1/*` is served by Vercel functions.

Auth talks to Supabase from the browser. Public project defaults ship in `src/integrations/supabase/public-env.ts`. You can still override them in the Vercel project with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (rebuild after changing). Also add your Vercel domain under Supabase Auth → URL configuration → Redirect URLs / Site URL.
