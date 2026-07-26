# npm Release Guide

`type-chain` is not published. The repository is temporarily public for policy bootstrap and must be switched to private before the first implementation PR. A private GitHub repository may later publish a public npm package; repository and registry visibility are separate.

## First-release prerequisites

1. Implementation, public API documentation, tests, build, and tarball verification are complete.
2. Version is not `0.0.0-development`.
3. The npm name is rechecked and an authorized npm account has publish rights.
4. A GitHub Actions OIDC trusted publisher is configured for the exact repository, workflow, and protected `npm` environment.
5. A reviewed `dev` → `main` PR passes CI and `release-promotion`.

## Invariant

The npm version, annotated tag `v<version>`, and GitHub Release must resolve to the same protected `main` commit. Publish first, then tag, then GitHub Release. Never persist an npm token in this repository.

## Verification

Poll `npm view type-chain@<version> version dist-tags --json`, install the exact registry artifact in a clean consumer, test every documented import/bin, and verify the annotated tag and GitHub Release target the same SHA.
