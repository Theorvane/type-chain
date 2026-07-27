import assert from "node:assert/strict";
import test from "node:test";

import { getPackedTarballFilename } from "../scripts/pack-json.mjs";

test("reads the tarball filename from npm 11 array output", () => {
  assert.equal(
    getPackedTarballFilename([
      {
        filename: "theorvane-type-chain-0.1.0.tgz",
        name: "@theorvane/type-chain",
      },
    ]),
    "theorvane-type-chain-0.1.0.tgz",
  );
});

test("reads the tarball filename from npm 12 package-keyed output", () => {
  assert.equal(
    getPackedTarballFilename({
      "@theorvane/type-chain": {
        filename: "theorvane-type-chain-0.1.0.tgz",
        name: "@theorvane/type-chain",
      },
    }),
    "theorvane-type-chain-0.1.0.tgz",
  );
});

test("rejects malformed pack output without a filename", () => {
  assert.throws(
    () => getPackedTarballFilename({ "@theorvane/type-chain": {} }),
    /tarball filename/,
  );
});
