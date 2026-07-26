import { existsSync } from "node:fs";

const required = ["dist/index.js", "dist/index.d.ts", "README.md", "LICENSE"];
const missing = required.filter((path) => !existsSync(path));
if (missing.length > 0)
  throw new Error(`Package contract is incomplete: ${missing.join(", ")}`);
console.log(`Verified package artifacts: ${required.join(", ")}`);
