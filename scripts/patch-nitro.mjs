import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve("node_modules/nitro/dist/runtime/internal/vite/dev-worker.mjs");
if (!existsSync(target)) {
  console.warn("[patch-nitro] file not found, skip");
  process.exit(0);
}

const src = readFileSync(target, "utf8");
const needle =
  "for (let i = 0; i < 5 && !(this.entry || this.entryError); i++) {\n      await new Promise((r) => setTimeout(r, 100 * Math.pow(2, i)));\n    }";
const replacement =
  "for (let i = 0; i < 600 && !(this.entry || this.entryError); i++) {\n      await new Promise((r) => setTimeout(r, 50));\n    }";

if (src.includes("i < 600 && !(this.entry || this.entryError)")) {
  console.log("[patch-nitro] already applied");
  process.exit(0);
}

if (!src.includes(needle)) {
  console.warn("[patch-nitro] pattern not found — nitro version may have changed");
  process.exit(0);
}

writeFileSync(target, src.replace(needle, replacement));
console.log("[patch-nitro] applied cold-start retry patch");
