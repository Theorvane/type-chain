# npm Release Guide

`type-chain` is not published. The repository is private under manual governance. A private GitHub repository may later publish a public npm package; repository and registry visibility are separate.

## Public-conversion gate

Keep the repository private until the implementation, public API documentation, consumer-tarball verification, npm release-readiness, and independent review are complete. At that point, switch the repository to public and create/read back active GitHub rulesets for `dev` (`verify`) and `main` (`verify` and `release-promotion`) before accepting public implementation PRs. Until then, follow the manual merge evidence requirements in `CONTRIBUTING.md` and `.agents/README.md`.

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
