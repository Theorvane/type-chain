# Contributing to TypeChain

TypeChain is private while its initial contracts are established. GitHub Free cannot enforce Rulesets or branch protection for this private repository, so maintainers must manually enforce the workflow below. The repository will become public only after the implementation and npm release-readiness criteria in `docs/release.md` are satisfied and GitHub rulesets can be restored and verified.

## Required workflow

1. Open a focused GitHub Issue before changing product code, public API, package metadata, CI, or policy documentation.
2. Branch from `dev` as `<type>/<issue-number>-<short-description>`.
3. Use test-first development for behavior changes.
4. Open one focused PR to `dev` with `Closes #<issue-number>`.
5. Run `npm run verify`, `npm run verify:publish`, and `git diff --check` before requesting review.
6. Merge only after CI, resolved review threads, and independent review of the exact current head.
7. Do not direct-push or merge `dev`/`main`. A maintainer must manually confirm the issue scope, exact PR HEAD, green CI, resolved threads, and independent review before merging.
8. Promote `dev` to `main` only through a dedicated release PR.

## Tool and decorator contracts

- Public tools require explicit runtime schemas; TypeScript parameter types are not schemas.
- Do not use `any`, `@ts-ignore`, unsafe type assertions, or implicit external side effects.
- Preserve LangChain runtime context, streaming, commands, and error semantics.
- State-changing tools need documented authorization, approval, idempotency, retry, and audit behavior.
- Legacy decorators or reflection metadata require an explicit compatibility decision and regression tests.

## Local checks

```bash
npm ci
npm run verify
npm run verify:publish
```

`verify:publish` checks the tarball shape but does not authorize publishing. The `prepublishOnly` hook blocks releases until the approved release process is complete.
