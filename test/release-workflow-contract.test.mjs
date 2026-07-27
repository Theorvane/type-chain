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
  assert.match(workflow, /npm-12-release-readiness:/);
  assert.match(workflow, /name: npm 12 release readiness/);
  assert.match(workflow, /npm install --global "npm@12\.0\.1"/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=low/);
  assert.match(
    workflow,
    /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/,
  );
  assert.match(
    workflow,
    /actions\/setup-node@1e60f620b9541d16bece96c5465dc8ee9832be0b/,
  );
  assert.doesNotMatch(workflow, /actions\/(checkout|setup-node)@v\d/);
});

test("publish readiness verifies an installed packed consumer", async () => {
  const manifest = JSON.parse(await readWorkflow("../package.json"));
  const script = await readWorkflow("../scripts/verify-packed-consumer.mjs");

  const packJson = await readWorkflow("../scripts/pack-json.mjs");

  assert.match(manifest.scripts.verify, /verify:package/);
  assert.match(manifest.scripts["verify:publish"], /verify:consumer/);
  assert.match(script, /"npm", \["pack", "--json", "--ignore-scripts"\]/);
  assert.match(script, /getPackedTarballFilename/);
  assert.match(packJson, /Array\.isArray\(packed\)/);
  assert.match(packJson, /Object\.values\(packed \?\? \{\}\)/);
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

test("release workflow uses a token-free OIDC-only exact-SHA publication path", async () => {
  const workflow = await readWorkflow("../.github/workflows/publish.yml");
  const script = await readWorkflow("../scripts/publish-release.mjs");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /release_sha:/);
  assert.match(workflow, /confirm_publish:/);
  assert.doesNotMatch(workflow, /push:\n {4}branches: \[main\]/);
  assert.match(workflow, /inputs\.confirm_publish == 'publish'/);
  assert.match(workflow, /ref: \$\{\{ inputs\.release_sha \}\}/);
  assert.match(workflow, /GITHUB_SHA: \$\{\{ inputs\.release_sha \}\}/);
  assert.match(
    workflow,
    /ACTUAL_MAIN="\$\(git ls-remote --exit-code origin refs\/heads\/main \| cut -f1\)"/,
  );
  assert.doesNotMatch(workflow, /git fetch origin/);
  assert.doesNotMatch(workflow, /git rev-parse origin\/main/);
  assert.match(workflow, /test "\$ACTUAL_MAIN" = "\$GITHUB_SHA"/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /environment: npm/);
  assert.match(workflow, /npm run verify:publish/);
  assert.match(workflow, /node scripts\/publish-release\.mjs/);
  assert.match(workflow, /TYPE_CHAIN_RELEASE_APPROVED: "true"/);
  assert.match(workflow, /npm install --global "npm@>=11\.5\.1"/);
  assert.doesNotMatch(workflow, /npm install --global npm@>=/);
  assert.match(workflow, /GITHUB_SHA: \$\{\{ inputs\.release_sha \}\}/);
  assert.doesNotMatch(workflow, /(NPM_TOKEN|GITHUB_TOKEN|contents: write)/);
  assert.match(script, /"git", \["rev-parse", "HEAD"\]/);
  assert.match(script, /checkedOutHead !== sha/);
  assert.match(script, /"npm", \["publish", "--access", "public"\]/);
  assert.match(script, /gitHead/);
  assert.doesNotMatch(script, /(git tag|"tag"|gh release|"release")/);
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
