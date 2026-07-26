import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url)),
);
if (process.env.TYPE_CHAIN_RELEASE_APPROVED !== "true") {
  throw new Error(
    "Publication is blocked. Complete the protected release process and authorize only the release workflow.",
  );
}
if (manifest.version === "0.0.0-development") {
  throw new Error(
    "Publication is blocked: choose a reviewed, release-ready version.",
  );
}
