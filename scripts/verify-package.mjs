import { existsSync, readFileSync } from "node:fs";

const required = [
  "dist/index.js",
  "dist/index.cjs",
  "dist/index.d.ts",
  "dist/index.d.cts",
  "dist/langchain.js",
  "dist/langchain.cjs",
  "dist/langchain.d.ts",
  "dist/langchain.d.cts",
  "dist/agent.js",
  "dist/agent.cjs",
  "dist/agent.d.ts",
  "dist/agent.d.cts",
  "dist/typemcp.js",
  "dist/typemcp.cjs",
  "dist/typemcp.d.ts",
  "dist/typemcp.d.cts",
  "dist/legacy.js",
  "dist/legacy.cjs",
  "dist/legacy.d.ts",
  "README.md",
  "LICENSE",
];
const missing = required.filter((path) => !existsSync(path));
if (missing.length > 0)
  throw new Error(`Package contract is incomplete: ${missing.join(", ")}`);

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const rootExport = packageJson.exports?.["."];
if (
  JSON.stringify(rootExport) !==
  JSON.stringify({
    import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
    require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
  })
) {
  throw new Error("Package contract is missing the type-chain root export.");
}

const subpathExports = {
  "./langchain": {
    import: { types: "./dist/langchain.d.ts", default: "./dist/langchain.js" },
    require: {
      types: "./dist/langchain.d.cts",
      default: "./dist/langchain.cjs",
    },
  },
  "./agent": {
    import: { types: "./dist/agent.d.ts", default: "./dist/agent.js" },
    require: { types: "./dist/agent.d.cts", default: "./dist/agent.cjs" },
  },
  "./typemcp": {
    import: { types: "./dist/typemcp.d.ts", default: "./dist/typemcp.js" },
    require: {
      types: "./dist/typemcp.d.cts",
      default: "./dist/typemcp.cjs",
    },
  },
};

for (const [subpath, expected] of Object.entries(subpathExports)) {
  if (
    JSON.stringify(packageJson.exports?.[subpath]) !== JSON.stringify(expected)
  ) {
    throw new Error(
      `Package contract is missing the type-chain${subpath} export.`,
    );
  }
}

const legacyExport = packageJson.exports?.["./legacy"];
if (
  legacyExport?.import?.types !== "./dist/legacy.d.ts" ||
  legacyExport?.import?.default !== "./dist/legacy.js" ||
  legacyExport?.require?.types !== "./dist/legacy.d.cts" ||
  legacyExport?.require?.default !== "./dist/legacy.cjs"
) {
  throw new Error("Package contract is missing the type-chain/legacy export.");
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
