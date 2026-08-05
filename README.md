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
