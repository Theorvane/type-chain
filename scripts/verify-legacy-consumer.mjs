import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const packageRoot = process.cwd();
let consumer;
let tarballPath;

function run(command, args, cwd = packageRoot) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

try {
  run("npm", ["run", "build"]);
  const [packed] = JSON.parse(
    run("npm", ["pack", "--json", "--ignore-scripts"]),
  );
  tarballPath = resolve(packageRoot, packed.filename);
  consumer = mkdtempSync(join(tmpdir(), "type-chain-legacy-consumer-"));
  run("npm", ["init", "--yes"], consumer);
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      tarballPath,
      "@types/node",
    ],
    consumer,
  );
  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "Node16",
          moduleResolution: "Node16",
          experimentalDecorators: true,
          strict: true,
          skipLibCheck: true,
          outDir: "dist",
        },
        include: ["tools.ts"],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(consumer, "tools.ts"),
    `import { Agent, getToolDefinitions, Policy, Tool } from "@theorvane/type-chain/legacy";\n\n@Agent({ systemPrompt: "Use legacy tools." })\nclass LegacyTools {\n  @Tool({ name: "search_issues", description: "Searches issues.", schema: { type: "object" } })\n  @Policy({ authorization: "required" })\n  search({ query }: { readonly query: string }) { return \`legacy:\${query}\`; }\n}\n\nconst definition = getToolDefinitions(new LegacyTools())[0];\nif (definition?.invoke({ query: "123" }) !== "legacy:123") throw new Error("Legacy tool was not registered.");\n`,
  );
  run(
    resolve(packageRoot, "node_modules/typescript/bin/tsc"),
    ["--project", "tsconfig.json"],
    consumer,
  );
  run("node", ["dist/tools.js"], consumer);
  console.log(
    "Verified packed CommonJS consumer with legacy TypeScript decorators.",
  );
} finally {
  if (consumer !== undefined)
    rmSync(consumer, { force: true, recursive: true });
  if (tarballPath !== undefined) rmSync(tarballPath, { force: true });
}
