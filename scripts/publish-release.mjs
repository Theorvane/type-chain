import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const { name, version } = manifest;
const sha = process.env.GITHUB_SHA;

if (typeof sha !== "string" || !/^[0-9a-f]{40}$/i.test(sha)) {
  throw new Error("Trusted publication requires the exact GITHUB_SHA.");
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function tryRun(command, args) {
  try {
    return { ok: true, output: run(command, args) };
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

const checkedOutHead = run("git", ["rev-parse", "HEAD"]);
if (checkedOutHead !== sha) {
  throw new Error(
    `Refusing to publish checked-out ${checkedOutHead}; expected GITHUB_SHA ${sha}.`,
  );
}

const publication = registryPackage();
if (publication !== undefined) {
  requireMatchingGitHead(publication);
  console.log(
    `Trusted publication already complete for ${name}@${version} at ${sha}.`,
  );
  process.exit(0);
}

console.log(`Publishing ${name}@${version} through npm trusted publishing.`);
run("npm", ["publish", "--access", "public"]);
console.log(`Trusted publication submitted for ${name}@${version} at ${sha}.`);
