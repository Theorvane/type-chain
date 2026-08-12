import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { getPackedTarballFilename } from "./pack-json.mjs";

const packageRoot = process.cwd();
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const packageName = manifest.name;
const consumers = [];
const npmCache = mkdtempSync(join(tmpdir(), "type-chain-npm-cache-"));
let tarballPath;
const entrypoints = [
  [
    packageName,
    ["Policy", "Tool", "getToolDefinitions", "withToolPolicyGuard"],
  ],
  [`${packageName}/langchain`, ["toLangChainTools", "toGuardedLangChainTools"]],
  [`${packageName}/agent`, ["Agent", "buildAgent", "buildGuardedAgent"]],
  [
    `${packageName}/typemcp`,
    [
      "createTypeMcpLangChainTools",
      "createGuardedTypeMcpLangChainTools",
      "createTypeMcpAgent",
      "createGuardedTypeMcpAgent",
    ],
  ],
  [`${packageName}/legacy`, ["Agent", "Policy", "Tool", "getToolDefinitions"]],
];

function run(command, args, cwd = packageRoot) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    env:
      command === "npm"
        ? { ...process.env, npm_config_cache: npmCache }
        : process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function createConsumer(prefix, type) {
  const directory = mkdtempSync(join(tmpdir(), `${prefix}-`));
  consumers.push(directory);
  run("npm", ["init", "--yes"], directory);
  run("npm", ["pkg", "set", `type=${type}`], directory);
  return directory;
}

function install(consumer, ...packages) {
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--omit=optional",
      ...packages,
    ],
    consumer,
  );
}

function verifyEntrypoints(consumer, mode) {
  const source =
    mode === "esm"
      ? [
          `const entrypoints = ${JSON.stringify(entrypoints)};`,
          "for (const [specifier, names] of entrypoints) {",
          "  const module = await import(specifier);",
          "  for (const name of names) {",
          "    if (!(name in module)) throw new Error('Missing ESM export ' + name + ' from ' + specifier);",
          "  }",
          "}",
        ].join("\n")
      : [
          "const { createRequire } = require('node:module');",
          "const requireFromConsumer = createRequire(process.cwd() + '/package.json');",
          `const entrypoints = ${JSON.stringify(entrypoints)};`,
          "for (const [specifier, names] of entrypoints) {",
          "  const module = requireFromConsumer(specifier);",
          "  for (const name of names) {",
          "    if (!(name in module)) throw new Error('Missing CommonJS export ' + name + ' from ' + specifier);",
          "  }",
          "}",
        ].join("\n");
  run(
    "node",
    [
      `--input-type=${mode === "esm" ? "module" : "commonjs"}`,
      "--eval",
      source,
    ],
    consumer,
  );
}

function compileConsumerSources(consumer, type, sources) {
  mkdirSync(join(consumer, "src"));
  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: type === "module" ? "NodeNext" : "Node16",
          moduleResolution: type === "module" ? "NodeNext" : "Node16",
          ...(type === "module"
            ? { lib: ["ES2022", "ESNext.Decorators"] }
            : { experimentalDecorators: true }),
          types: ["node"],
          strict: true,
          skipLibCheck: true,
          ...(type === "module" ? { verbatimModuleSyntax: true } : {}),
          rootDir: "src",
          outDir: "dist",
        },
        include: ["src/**/*.ts"],
      },
      null,
      2,
    ),
  );
  for (const [filename, source] of Object.entries(sources))
    writeFileSync(join(consumer, "src", filename), source);
  run(
    resolve(packageRoot, "node_modules/typescript/bin/tsc"),
    ["--project", "tsconfig.json"],
    consumer,
  );
}

try {
  run("npm", ["run", "build"]);
  const packed = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts"]));
  const filename = getPackedTarballFilename(packed);
  tarballPath = resolve(packageRoot, filename);

  const integrationConsumer = createConsumer(
    "type-chain-esm-consumer",
    "module",
  );
  const peers = [
    `@langchain/core@${manifest.devDependencies["@langchain/core"]}`,
    `langchain@${manifest.devDependencies.langchain}`,
    `@theorvane/type-mcp@${manifest.devDependencies["@theorvane/type-mcp"]}`,
  ];
  install(integrationConsumer, tarballPath, ...peers, "zod", "@types/node");
  compileConsumerSources(integrationConsumer, "module", {
    "standard-decorators.ts": `import { Policy, Tool, getToolDefinitions, withToolPolicyGuard } from ${JSON.stringify(packageName)};\nimport { toGuardedLangChainTools, toLangChainTools } from ${JSON.stringify(`${packageName}/langchain`)};\nimport { Agent, buildAgent, buildGuardedAgent } from ${JSON.stringify(`${packageName}/agent`)};\nimport { createGuardedTypeMcpAgent, createGuardedTypeMcpLangChainTools, createTypeMcpAgent, createTypeMcpLangChainTools } from ${JSON.stringify(`${packageName}/typemcp`)};\nimport * as legacy from ${JSON.stringify(`${packageName}/legacy`)};\n\n@Agent({ systemPrompt: "Use standard tools." })\nclass StandardTools {\n  @Policy({ authorization: "required" })\n  @Tool({ name: "search_issues", description: "Searches issues.", schema: { type: "object" } })\n  search({ query }: { readonly query: string }) { return \`standard:\${query}\`; }\n}\n\nconst definition = getToolDefinitions(new StandardTools())[0];\nif (definition?.invoke({ query: "123" }) !== "standard:123") throw new Error("Standard tool was not registered.");\nvoid withToolPolicyGuard;\nvoid toLangChainTools;\nvoid toGuardedLangChainTools;\nvoid buildAgent;\nvoid buildGuardedAgent;\nvoid createTypeMcpLangChainTools;\nvoid createGuardedTypeMcpLangChainTools;\nvoid createTypeMcpAgent;\nvoid createGuardedTypeMcpAgent;\nvoid legacy;\n`,
  });
  run("node", ["dist/standard-decorators.js"], integrationConsumer);
  verifyEntrypoints(integrationConsumer, "esm");

  const commonJsConsumer = createConsumer(
    "type-chain-commonjs-consumer",
    "commonjs",
  );
  install(commonJsConsumer, tarballPath, ...peers, "@types/node");
  compileConsumerSources(commonJsConsumer, "commonjs", {
    "legacy-decorators.ts": `import { getToolDefinitions } from ${JSON.stringify(packageName)};\nimport { toGuardedLangChainTools, toLangChainTools } from ${JSON.stringify(`${packageName}/langchain`)};\nimport { Agent as StandardAgent, buildAgent, buildGuardedAgent } from ${JSON.stringify(`${packageName}/agent`)};\nimport { createGuardedTypeMcpAgent, createGuardedTypeMcpLangChainTools, createTypeMcpAgent, createTypeMcpLangChainTools } from ${JSON.stringify(`${packageName}/typemcp`)};\nimport { Agent, Policy, Tool, getToolDefinitions as getLegacyToolDefinitions } from ${JSON.stringify(`${packageName}/legacy`)};\n\n@Agent({ systemPrompt: "Use legacy tools." })\nclass LegacyTools {\n  @Tool({ name: "search_issues", description: "Searches issues.", schema: { type: "object" } })\n  @Policy({ authorization: "required" })\n  search({ query }: { readonly query: string }) { return \`legacy:\${query}\`; }\n}\n\nconst definition = getLegacyToolDefinitions(new LegacyTools())[0];\nif (definition?.invoke({ query: "123" }) !== "legacy:123") throw new Error("Legacy tool was not registered.");\nvoid getToolDefinitions;\nvoid toLangChainTools;\nvoid toGuardedLangChainTools;\nvoid StandardAgent;\nvoid buildAgent;\nvoid buildGuardedAgent;\nvoid createTypeMcpLangChainTools;\nvoid createGuardedTypeMcpLangChainTools;\nvoid createTypeMcpAgent;\nvoid createGuardedTypeMcpAgent;\n`,
  });
  run("node", ["dist/legacy-decorators.js"], commonJsConsumer);
  verifyEntrypoints(commonJsConsumer, "commonjs");

  console.log(
    "Verified packed ESM and CommonJS consumers: all public entrypoints load and resolve; standard and legacy decorators execute in their supported TypeScript modes.",
  );
} finally {
  for (const consumer of consumers)
    rmSync(consumer, { force: true, recursive: true });
  rmSync(npmCache, { force: true, recursive: true });
  if (tarballPath !== undefined) rmSync(tarballPath, { force: true });
}
