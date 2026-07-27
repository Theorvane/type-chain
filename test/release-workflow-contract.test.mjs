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

test("publish readiness verifies an installed packed consumer", async () => {
  const manifest = JSON.parse(await readWorkflow("../package.json"));
  const script = await readWorkflow("../scripts/verify-packed-consumer.mjs");

  assert.match(manifest.scripts.verify, /verify:package/);
  assert.match(manifest.scripts["verify:publish"], /verify:consumer/);
  assert.match(script, /npm pack/);
  assert.match(script, /toGuardedLangChainTools/);
  assert.match(script, /buildGuardedAgent/);
  assert.match(script, /createTypeMcpAgent/);
  assert.match(script, /createGuardedTypeMcpAgent/);
  assert.match(script, /--omit=optional/);
});

test("public release metadata and documentation use the scoped first-release contract", async () => {
  const manifest = JSON.parse(await readWorkflow("../package.json"));
  const readme = await readWorkflow("../README.md");
  const releaseGuide = await readWorkflow("../docs/release.md");

  assert.equal(manifest.name, "@theorvane/type-chain");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.publishConfig.access, "public");
  assert.match(readme, /After registry publication is verified/);
  assert.match(readme, /not yet published/i);
  assert.doesNotMatch(readme, /Install the published package/);
  assert.match(readme, /npm install @theorvane\/type-chain/);
  assert.match(readme, /from "@theorvane\/type-chain/);
  assert.match(releaseGuide, /@theorvane\/type-chain@0\.1\.0/);
  assert.match(releaseGuide, /not yet published/i);
});

test("release workflow uses OIDC and state-aware publish before tag/release", async () => {
  const workflow = await readWorkflow("../.github/workflows/publish.yml");
  const script = await readWorkflow("../scripts/publish-release.mjs");

  assert.match(workflow, /push:\n {4}branches: \[main\]/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /environment: npm/);
  assert.match(workflow, /npm run verify:publish/);
  assert.match(workflow, /node scripts\/publish-release\.mjs/);
  assert.match(workflow, /TYPE_CHAIN_RELEASE_APPROVED: "true"/);
  assert.match(workflow, /GITHUB_SHA: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(workflow, /NPM_TOKEN/);
  assert.match(script, /"npm", \["publish"/);
  assert.match(script, /"tag", "-a"/);
  assert.match(script, /"release",\s+"create"/);
  assert.match(script, /gitHead/);
  assert.match(script, /Refusing to publish after an existing/);
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
