import assert from "node:assert/strict";

export function getPackedTarballFilename(packed) {
  const entries = Array.isArray(packed) ? packed : Object.values(packed ?? {});
  const filename = entries[0]?.filename;

  assert.equal(
    typeof filename,
    "string",
    "npm pack did not return a tarball filename.",
  );

  return filename;
}
