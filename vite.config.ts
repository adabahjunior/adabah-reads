import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { balance, orders, packages } from "./src/server/api-v1-handlers";
import { sendFetchResponse, toFetchRequest } from "./src/server/node-api-adapter";

const apiHandlers = {
  "/api/v1/balance": balance,
  "/api/v1/packages": packages,
  "/api/v1/orders": orders,
};

export default defineConfig({
  server: {
    host: true,
    port: 8080,
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "bundlemart-api-v1",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
          const handler = apiHandlers[pathname as keyof typeof apiHandlers];
          if (!handler) return next();
          try {
            await sendFetchResponse(await handler(await toFetchRequest(req)), res);
          } catch (error) {
            console.error("API request failed", error);
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      },
    },
  ],
});
