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
let tarballPath;

function run(command, args, cwd = packageRoot) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function createConsumer(prefix) {
  const directory = mkdtempSync(join(tmpdir(), `${prefix}-`));
  consumers.push(directory);
  run("npm", ["init", "--yes"], directory);
  run("npm", ["pkg", "set", "type=module"], directory);
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

function verifyImport(consumer, source) {
  run("node", ["--input-type=module", "--eval", source], consumer);
}

function compileDocumentationSources(consumer, sources) {
  mkdirSync(join(consumer, "src"));
  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          lib: ["ES2022", "ESNext.Decorators", "DOM", "DOM.Iterable"],
          types: ["node"],
          strict: true,
          skipLibCheck: true,
          verbatimModuleSyntax: true,
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
    ["--noEmit", "--project", "tsconfig.json"],
    consumer,
  );
}

try {
  run("npm", ["run", "build"]);
  const packed = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts"]));
  const filename = getPackedTarballFilename(packed);
  tarballPath = resolve(packageRoot, filename);

  const rootConsumer = createConsumer("type-chain-root-consumer");
  install(rootConsumer, tarballPath, "zod", "@types/node");
  compileDocumentationSources(rootConsumer, {
    "petstore-tools.ts": `import { z } from "zod";\nimport { Tool } from ${JSON.stringify(packageName)};\n\nexport class PetstoreTools {\n  @Tool({ name: "find_product", description: "Find a Petstore product by SKU.", schema: z.object({ sku: z.string().min(1) }) })\n  findProduct({ sku }: { readonly sku: string }) { return { sku, available: true }; }\n}\n`,
    "inspect-tools.ts": `import { getToolDefinitions } from ${JSON.stringify(packageName)};\nimport { PetstoreTools } from "./petstore-tools.js";\nexport const definitions = getToolDefinitions(new PetstoreTools());\n`,
  });
  verifyImport(
    rootConsumer,
    [
      `const root = await import(${JSON.stringify(packageName)});`,
      "for (const name of ['Policy', 'Tool', 'getToolDefinitions', 'withToolPolicyGuard']) {",
      "  if (!(name in root)) throw new Error('Missing root export: ' + name);",
      "}",
    ].join("\n"),
  );

  const integrationConsumer = createConsumer("type-chain-integration-consumer");
  const peers = [
    `@langchain/core@${manifest.devDependencies["@langchain/core"]}`,
    `langchain@${manifest.devDependencies.langchain}`,
    `@theorvane/type-mcp@${manifest.devDependencies["@theorvane/type-mcp"]}`,
  ];
  install(integrationConsumer, tarballPath, ...peers, "zod", "@types/node");
  compileDocumentationSources(integrationConsumer, {
    "petstore-tools.ts": `import { z } from "zod";\nimport { Tool } from ${JSON.stringify(packageName)};\n\nexport class PetstoreTools {\n  @Tool({ name: "find_product", description: "Find a Petstore product by SKU.", schema: z.object({ sku: z.string().min(1) }) })\n  findProduct({ sku }: { readonly sku: string }) { return { sku, available: true }; }\n}\n`,
    "langchain-tools.ts": `import { toLangChainTools } from ${JSON.stringify(`${packageName}/langchain`)};\nimport { PetstoreTools } from "./petstore-tools.js";\nexport const tools = toLangChainTools(new PetstoreTools());\n`,
    "petstore-agent.ts": `import { Agent, buildAgent } from ${JSON.stringify(`${packageName}/agent`)};\nimport { PetstoreTools } from "./petstore-tools.js";\n@Agent({ systemPrompt: "Use Petstore tools only." })\nclass PetstoreAgent extends PetstoreTools {}\ndeclare const applicationOwnedModel: Parameters<typeof buildAgent>[1]["model"];\nexport const agent = buildAgent(new PetstoreAgent(), { model: applicationOwnedModel });\n`,
    "petstore-server.ts": `import { z } from "zod";\nimport { McpServer, McpTool } from "@theorvane/type-mcp";\nexport interface PetstoreClient { findBySku(sku: string): Promise<unknown>; }\n@McpServer({ name: "petstore", version: "1.0.0" })\nexport class PetstoreServer {\n  private client: PetstoreClient | undefined;\n  configure(client: PetstoreClient) { this.client = client; return this; }\n  @McpTool({ name: "find-product", description: "Find a Petstore product by SKU.", input: z.object({ sku: z.string().min(1) }) })\n  findProduct({ sku }: { readonly sku: string }) { if (this.client === undefined) throw new Error("Petstore client was not configured."); return this.client.findBySku(sku); }\n}\n`,
    "typemcp-tools.ts": `import { createTypeMcpLangChainTools } from ${JSON.stringify(`${packageName}/typemcp`)};\nimport type { PetstoreClient } from "./petstore-server.js";\nimport { PetstoreServer } from "./petstore-server.js";\ndeclare const petstoreClient: PetstoreClient;\nexport const tools = await createTypeMcpLangChainTools(PetstoreServer, { resolver: { resolve: () => new PetstoreServer().configure(petstoreClient) } });\n`,
  });
  verifyImport(
    integrationConsumer,
    [
      `const langchain = await import(${JSON.stringify(`${packageName}/langchain`)});`,
      `const agent = await import(${JSON.stringify(`${packageName}/agent`)});`,
      `const typemcp = await import(${JSON.stringify(`${packageName}/typemcp`)});`,
      "for (const [module, names] of [[langchain, ['toLangChainTools', 'toGuardedLangChainTools']], [agent, ['Agent', 'buildAgent', 'buildGuardedAgent']], [typemcp, ['createTypeMcpLangChainTools', 'createGuardedTypeMcpLangChainTools', 'createTypeMcpAgent', 'createGuardedTypeMcpAgent']]]) {",
      "  for (const name of names) if (!(name in module)) throw new Error('Missing subpath export: ' + name);",
      "}",
    ].join("\n"),
  );

  console.log(
    "Verified packed consumers: root without optional peers; langchain, agent, and typemcp with declared peers.",
  );
} finally {
  for (const consumer of consumers)
    rmSync(consumer, { force: true, recursive: true });
  if (tarballPath !== undefined) rmSync(tarballPath, { force: true });
}
