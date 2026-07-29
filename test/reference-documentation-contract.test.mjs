import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const documents = [
  "docs/README.md",
  "docs/guides/core-concepts.md",
  "docs/guides/petstore-walkthrough.md",
];

const taskGuides = [
  "docs/guides/tools-and-definitions.md",
  "docs/guides/policy.md",
  "docs/guides/langchain-integration.md",
  "docs/guides/agent-builder.md",
  "docs/guides/typemcp-bridge.md",
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
  assert.match(content, /export class PetstoreAdminTools/);
  assert.match(content, /declare const applicationOwnedModel/);
  assert.match(
    content,
    /models, credentials, policy enforcement, state, hosting, deployment, and cross-process MCP transport/,
  );
  assert.doesNotMatch(
    content,
    /TypeChain (?:chooses|owns) (?:a model|authorization|deployment)/i,
  );
});

test("every routed TypeChain task guide provides a complete, file-based learning path", async () => {
  for (const path of taskGuides) {
    const content = await readFile(path, "utf8");

    assert.match(content, /## Prerequisites|## Requirements/);
    assert.match(content, /## Install/);
    assert.match(content, /## Configure TypeScript/);
    assert.match(content, /Create `src\/[\w-]+\.ts`/);
    assert.match(content, /## Expected behavior/);
    assert.match(
      content,
      /## Responsibility boundary|## What TypeChain does not own|## Transport boundary/,
    );
    assert.match(content, /## Next steps/);
  }
});

test("the Petstore policy and TypeMCP bridge examples name files and keep dependencies explicit", async () => {
  const content = await readFile("docs/guides/petstore-walkthrough.md", "utf8");

  assert.match(content, /create `src\/petstore-admin-tools\.ts`/i);
  assert.match(content, /import \{ z \} from "zod";/);
  assert.match(content, /create `src\/petstore-server\.ts`/i);
  assert.match(content, /create `src\/typemcp-tools\.ts`/i);
  assert.match(content, /declare const petstoreClient:/);
  assert.match(content, /## Expected behavior/);
});
