# Task brief — runnable TypeChain Petstore learning curriculum

**Owner:** Hermes Agent

**Date:** 2026-07-29

**Status:** in-progress

**Related plan:** `docs/planning/2026-07-29-reference-first-learning-curricula-implementation.md#phase-2`

## Objective

Publish a source-owned, release-accurate TypeChain curriculum that continues a strict TypeScript Petstore workspace with typed tools, policy intent, application-owned enforcement, and explicit optional composition boundaries.

## Scope

**In:**
- `docs/guides/petstore-typechain-foundation.md` and `docs/guides/petstore-policy-and-composition.md`.
- A bounded update to the existing Petstore walkthrough, composition selection guide, and docs index.
- Documentation-contract coverage for the reader path and ownership boundaries.

**Out:**
- Runtime API, model/provider, credential, authorization-enforcement, persistence, hosted transport, or deployment changes.

## Acceptance criteria

- [ ] Every new curriculum guide names prerequisites, workspace checkpoint, install/configuration, files, commands, expected behavior, failure guide, responsibility boundary, and next step.
- [ ] The guide uses release-validated `@theorvane/type-chain@0.1.1`, `@Tool()`, `@Policy()`, and application-owned dependencies.
- [ ] A clean installed consumer compiles the documented named files at each selected integration boundary.
- [ ] The docs contract is observed failing before the new guides and passes after the change.

## Files

- Create: `docs/guides/petstore-typechain-foundation.md`
- Create: `docs/guides/petstore-policy-and-composition.md`
- Modify: `docs/guides/petstore-walkthrough.md`
- Modify: `docs/guides/composition-selection.md`
- Modify: `docs/README.md`
- Modify: `test/reference-documentation-contract.test.mjs`
- Test: `test/reference-documentation-contract.test.mjs`

## Red → green evidence

| Stage | Command | Result / expected reason |
| --- | --- | --- |
| Red | `node --test test/reference-documentation-contract.test.mjs` | Observed ENOENT for `docs/guides/petstore-typechain-foundation.md`. |
| Green | `node --test test/reference-documentation-contract.test.mjs` | 4/4 tests passed after source guides and continuation headings were added. |
| Regression | `npm run verify` | 51 tests passed; lint, typecheck, build, and package verification passed. |

## Risks and boundaries

- Examples must remain aligned with the published 0.1.1 package and optional peer boundaries.
- TypeChain records metadata/adapts tools; model selection, credentials, authorization enforcement, state, persistence, transport, hosting, and deployment remain application-owned.

## Review handoff

- Spec review: pending
- Quality review: pending
- Final checks: `npm run verify`, `npm run verify:publish`, `npm audit --omit=dev --audit-level=high`, `git diff --check`
