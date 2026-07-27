# npm Release Guide

The intended public package is **`@theorvane/type-chain@0.1.0`**. It is **not yet published**: this document describes the reviewed release path and must not be read as registry-install evidence.

## Publication prerequisites

1. The GitHub repository is public and active rulesets protect `dev` (`verify`) and `main` (`verify`, `release-promotion`).
2. The npm organization owns the `@theorvane` scope and permits publication of `@theorvane/type-chain`.
3. A reviewed, repository-owned `dev` → `main` promotion passes CI and `release-promotion`.
4. npm Trusted Publishing is configured for this repository, `.github/workflows/publish.yml`, and the protected `npm` GitHub Environment.
5. The named version is absent from the npm registry, or an existing package proves it was produced from the exact protected `main` SHA.
6. Every open dependency advisory has a documented maintainer disposition; a clean production audit alone does not close that decision.

### Current advisory disposition

The current open Dependabot alert is a moderate advisory in `@hono/node-server`, installed only through the development dependency path `@theorvane/type-mcp` → `@modelcontextprotocol/sdk` → `@hono/node-server`. `npm audit --omit=dev --audit-level=low` is clean for the packed root artifact. TypeMCP's HTTP transport cannot be superficially downgraded without losing the required web-standard transport support; track remediation with the upstream TypeMCP transport work rather than publishing a misleading downgrade.

## Automated publication path

After a reviewed `dev` → `main` merge, `.github/workflows/publish.yml` runs only on the protected `main` push. It uses GitHub OIDC (`id-token: write`) and is token-free: it does not read `NPM_TOKEN`, `GITHUB_TOKEN`, or any credential secret. Its `contents: read` permission prevents it from creating Git refs or GitHub Releases.

The workflow:

1. installs dependencies and runs `npm run verify:publish`;
2. verifies the checked-out `HEAD` exactly equals `GITHUB_SHA`;
3. checks whether the exact npm version already exists and, if it does, requires a matching `gitHead`;
4. publishes the packed artifact through npm Trusted Publishing only when that version is absent.

The publication script fails closed on an invalid SHA, checkout mismatch, registry lookup error, or existing package whose provenance cannot be proven. It never creates a tag or GitHub Release; those optional GitHub metadata actions require separately reviewed, explicitly authorized credentials and must not be conflated with the token-free npm publish path.

## First-release bootstrap

npm may require one explicit, authorized bootstrap publication before it lets a package configure Trusted Publishing. If that is necessary, use a short-lived package-scoped credential only after the protected `main` release commit, tarball checks, package-name availability, and user authorization are confirmed. Do not store a token in source control or repository secrets; revoke it after bootstrap and configure the OIDC trusted publisher for all subsequent releases.

## Consumer verification

Before publishing, `npm run verify:publish` builds, inspects the package archive, and installs it into clean temporary consumers. It proves:

- the root import works without optional peers;
- `@theorvane/type-chain/langchain`, `@theorvane/type-chain/agent`, and `@theorvane/type-chain/typemcp` import with declared peers; and
- documented runtime exports are present in the packed tarball.

After a successful publication, poll:

```sh
npm view @theorvane/type-chain@0.1.0 version dist-tags --json
```

Then install that exact registry version into a fresh consumer and verify every documented import. A tag or GitHub Release, if desired, is a separate reviewed post-publication operation and must resolve to the verified `main` SHA.
