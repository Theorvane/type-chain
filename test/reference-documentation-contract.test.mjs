import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const documents = [
  "docs/README.md",
  "docs/guides/core-concepts.md",
  "docs/guides/petstore-walkthrough.md",
];

test("reference-first TypeChain documentation routes Petstore readers without claiming application-owned behavior", async () => {
  const content = (
    await Promise.all(documents.map((path) => readFile(path, "utf8")))
  ).join("\n");

  assert.match(content, /@theorvane\/type-chain@0\.1\.1/);
  for (const entryPoint of [
    "Define tools",
    "Enforce a policy",
    "Reuse with LangChain",
    "Build an agent",
    "Bridge TypeMCP in process",
  ]) {
    assert.match(content, new RegExp(entryPoint));
  }
  assert.match(content, /find_product/);
  assert.match(content, /@Tool\(\)/);
  assert.match(content, /@Policy\(\)/);
  assert.match(
    content,
    /models, credentials, policy enforcement, state, hosting, deployment, and cross-process MCP transport/,
  );
  assert.doesNotMatch(
    content,
    /TypeChain (?:chooses|owns) (?:a model|authorization|deployment)/i,
  );
});
