import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isVercel = Boolean(process.env["VERCEL"] || process.env["NITRO_PRESET"] === "vercel");

export default defineConfig({
  server: {
    host: true,
    port: 8080,
  },
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
    // Local: default Nitro. On Vercel (or NITRO_PRESET=vercel): Vercel preset.
    nitro(isVercel ? { preset: "vercel" } : {}),
  ],
});
