import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const { name, version } = manifest;
const sha = process.env.GITHUB_SHA;
const tag = `v${version}`;

if (typeof sha !== "string" || !/^[0-9a-f]{40}$/i.test(sha)) {
  throw new Error("Release reconciliation requires the exact GITHUB_SHA.");
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function tryRun(command, args, options = {}) {
  try {
    return { ok: true, output: run(command, args, options) };
  } catch (error) {
    return {
      ok: false,
      output: String(error.stderr ?? error.stdout ?? error.message),
    };
  }
}

function registryPackage() {
  const result = tryRun("npm", ["view", `${name}@${version}`, "--json"]);
  if (!result.ok) {
    if (/E404|404 Not Found/.test(result.output)) return undefined;
    throw new Error(`Unable to inspect npm registry state: ${result.output}`);
  }
  return JSON.parse(result.output);
}

function requireMatchingGitHead(metadata) {
  if (metadata.gitHead !== sha) {
    throw new Error(
      `Existing npm ${name}@${version} does not prove this release SHA: ${metadata.gitHead ?? "missing gitHead"}.`,
    );
  }
}

function tagState() {
  const raw = tryRun("git", ["rev-parse", "--verify", `refs/tags/${tag}`]);
  if (!raw.ok) return undefined;
  const peeled = tryRun("git", ["rev-parse", "--verify", `${tag}^{}`]);
  if (!peeled.ok) {
    throw new Error(`Existing ${tag} is not an annotated tag.`);
  }
  if (peeled.output !== sha) {
    throw new Error(`Existing ${tag} targets ${peeled.output}, not ${sha}.`);
  }
  return { raw: raw.output, peeled: peeled.output };
}

function releaseState() {
  const result = tryRun("gh", [
    "release",
    "view",
    tag,
    "--json",
    "targetCommitish",
  ]);
  if (!result.ok) {
    if (/not found|HTTP 404/i.test(result.output)) return undefined;
    throw new Error(`Unable to inspect GitHub Release state: ${result.output}`);
  }
  const release = JSON.parse(result.output);
  if (release.targetCommitish !== sha) {
    throw new Error(
      `Existing GitHub Release ${tag} targets ${release.targetCommitish}, not ${sha}.`,
    );
  }
  return release;
}

const publication = registryPackage();
const publicationExistedBeforeRun = publication !== undefined;
if (publicationExistedBeforeRun) requireMatchingGitHead(publication);

const tagInfo = tagState();
if (publicationExistedBeforeRun === false && tagInfo !== undefined) {
  throw new Error(
    `Refusing to publish after an existing ${tag}; release state is inconsistent.`,
  );
}
if (publication === undefined) {
  console.log(`Publishing ${name}@${version} through npm trusted publishing.`);
  run("npm", ["publish", "--access", "public"]);
}

if (tagInfo === undefined) {
  run("git", ["tag", "-a", tag, sha, "-m", `Release ${version}`]);
  run("git", ["push", "origin", tag]);
}

if (releaseState() === undefined) {
  run("gh", [
    "release",
    "create",
    tag,
    "--target",
    sha,
    "--title",
    tag,
    "--generate-notes",
  ]);
}

console.log(
  `Release reconciliation complete for ${name}@${version} at ${sha}.`,
);
