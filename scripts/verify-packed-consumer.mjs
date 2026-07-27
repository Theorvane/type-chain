import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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

try {
  run("npm", ["run", "build"]);
  const packed = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts"]));
  const filename = packed[0]?.filename;

  assert.equal(typeof filename, "string", "npm pack did not return a tarball.");
  tarballPath = resolve(packageRoot, filename);

  const rootConsumer = createConsumer("type-chain-root-consumer");
  install(rootConsumer, tarballPath);
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
  install(integrationConsumer, tarballPath, ...peers);
  verifyImport(
    integrationConsumer,
    [
      `const langchain = await import(${JSON.stringify(`${packageName}/langchain`)});`,
      `const agent = await import(${JSON.stringify(`${packageName}/agent`)});`,
      `const typemcp = await import(${JSON.stringify(`${packageName}/typemcp`)});`,
      "for (const [module, names] of [[langchain, ['toLangChainTools', 'toGuardedLangChainTools']], [agent, ['Agent', 'buildAgent', 'buildGuardedAgent']], [typemcp, ['createTypeMcpLangChainTools', 'createTypeMcpAgent']]]) {",
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
