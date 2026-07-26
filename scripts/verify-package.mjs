import { existsSync, readFileSync } from "node:fs";

const required = [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/langchain.js",
  "dist/langchain.d.ts",
  "dist/typemcp.js",
  "dist/typemcp.d.ts",
  "README.md",
  "LICENSE",
];
const missing = required.filter((path) => !existsSync(path));
if (missing.length > 0)
  throw new Error(`Package contract is incomplete: ${missing.join(", ")}`);

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const langChainExport = packageJson.exports?.["./langchain"];
if (
  langChainExport?.types !== "./dist/langchain.d.ts" ||
  langChainExport?.import !== "./dist/langchain.js"
) {
  throw new Error(
    "Package contract is missing the type-chain/langchain export.",
  );
}

const bridgeExport = packageJson.exports?.["./typemcp"];
if (
  bridgeExport?.types !== "./dist/typemcp.d.ts" ||
  bridgeExport?.import !== "./dist/typemcp.js"
) {
  throw new Error("Package contract is missing the type-chain/typemcp export.");
}

for (const dependency of [
  "@langchain/core",
  "@theorvane/type-mcp",
  "langchain",
]) {
  if (packageJson.peerDependencies?.[dependency] === undefined) {
    throw new Error(
      `Package contract is missing peer dependency: ${dependency}`,
    );
  }
  if (packageJson.peerDependenciesMeta?.[dependency]?.optional !== true) {
    throw new Error(`Package contract must mark ${dependency} as optional.`);
  }
}

console.log(`Verified package artifacts: ${required.join(", ")}`);
