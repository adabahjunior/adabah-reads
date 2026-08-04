# BundleMart

Data reselling platform (SwiftData-style reseller dashboard) built with Vite + TanStack Start.

## Local

```sh
npm i
npm run dev
```

Open http://localhost:8080 — starts on **Auth**, then **Reseller Dashboard** after login.

Demo account: `reseller@bundlemart.gh` / `demo1234`

## Deploy to Vercel

Connect the repo in Vercel (build: `npm run build`). Nitro auto-uses the Vercel preset on Vercel, or set:

```sh
NITRO_PRESET=vercel npm run build
```
