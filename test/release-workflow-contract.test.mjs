import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readWorkflow = async (path) =>
  readFile(new URL(path, import.meta.url), "utf8");

test("CI verifies both integration and release branches", async () => {
  const workflow = await readWorkflow("../.github/workflows/ci.yml");

  assert.match(workflow, /push:\n {4}branches: \[dev, main\]/);
  assert.match(workflow, /pull_request:\n {4}branches: \[dev, main\]/);
  assert.match(workflow, /verify:\n {4}name: verify/);
  assert.match(workflow, /npm run verify:publish/);
});

test("release promotion accepts only the dev integration branch", async () => {
  const workflow = await readWorkflow(
    "../.github/workflows/release-promotion.yml",
  );

  assert.match(workflow, /pull_request:\n {4}branches: \[main\]/);
  assert.match(
    workflow,
    /HEAD_REPOSITORY: \$\{\{ github\.event\.pull_request\.head\.repo\.full_name \}\}/,
  );
  assert.match(workflow, /TARGET_REPOSITORY: \$\{\{ github\.repository \}\}/);
  assert.match(workflow, /test "\$HEAD_REF" = "dev"/);
  assert.match(workflow, /test "\$HEAD_REPOSITORY" = "\$TARGET_REPOSITORY"/);
  assert.match(workflow, /name: release-promotion/);
});
