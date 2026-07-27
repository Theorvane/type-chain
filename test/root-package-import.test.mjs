import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const packageRoot = new URL("..", import.meta.url).pathname;

test("imports the metadata-only root package without optional peers", () => {
  const consumer = mkdtempSync(join(tmpdir(), "type-chain-root-consumer-"));

  try {
    const tarball = execFileSync(
      "npm",
      ["pack", "--silent", "--ignore-scripts", "--pack-destination", consumer],
      { cwd: packageRoot, encoding: "utf8" },
    ).trim();

    writeFileSync(
      join(consumer, "package.json"),
      JSON.stringify({
        name: "root-only-consumer",
        private: true,
        type: "module",
      }),
    );
    execFileSync(
      "npm",
      ["install", "--omit=optional", "--ignore-scripts", `./${tarball}`],
      { cwd: consumer, stdio: "pipe" },
    );

    const output = execFileSync(
      "node",
      [
        "--input-type=module",
        "--eval",
        'import * as typeChain from "type-chain"; console.log(Object.keys(typeChain).sort().join(","));',
      ],
      { cwd: consumer, encoding: "utf8" },
    );
    assert.equal(
      output.trim(),
      "Policy,Tool,getToolDefinitions,withToolPolicyGuard",
    );
  } finally {
    rmSync(consumer, { force: true, recursive: true });
  }
});
