# Reference-first TypeChain usage guides implementation plan

> **For Hermes:** Execute each task with test-first documentation contracts. Record the focused red command before authoring user-facing guide content.

**Goal:** Add detailed, release-accurate TypeChain reference documentation and a Petstore walkthrough that helps developers select the smallest supported composition boundary.

**Architecture:** Keep `docs/` canonical. A Node documentation contract protects the entry points and application-owned boundaries; a Petstore walkthrough moves from `@Tool()` metadata through optional guard, LangChain, agent, and in-process TypeMCP choices. It references existing behavior tests instead of introducing runtime APIs.

**Tech stack:** Markdown, Node 20+, TypeScript Stage 3 decorators, Node test runner, existing TypeChain integration tests.

**Issue:** #78

---

## Task 1: Add a failing reference-documentation contract

**Files:**
- Create: `test/reference-documentation-contract.test.mjs`

1. Write a Node test that reads `docs/README.md`, `docs/guides/core-concepts.md`, and `docs/guides/petstore-walkthrough.md`.
2. Require the published `@theorvane/type-chain@0.1.1` version, five entry points (definitions/policy/LangChain/agent/TypeMCP bridge), the Petstore tool, and explicit boundaries for model, credentials, enforcement, state, hosting, and cross-process transport.
3. Run `node --test test/reference-documentation-contract.test.mjs` and record RED because the guides are absent.
4. Do not modify runtime source or package metadata.

## Task 2: Add concepts and Petstore walkthrough documents

**Files:**
- Create: `docs/guides/core-concepts.md`
- Create: `docs/guides/petstore-walkthrough.md`

1. Explain Stage 3 tool metadata, runtime schemas, immutable/receiver-bound definitions, policy intent versus application guard, optional subpaths, agent ownership, and in-process TypeMCP constraints.
2. Use a `find_product` Petstore tool; show optional `@Policy()`, `toLangChainTools()`, `buildAgent()`, and `createTypeMcpLangChainTools()` as separate choices with real signatures.
3. Include prerequisites, installation, compiler config, named files, expected result, boundary panels, limitations, and next links.
4. Run the focused contract and confirm GREEN.

## Task 3: Reorganize canonical docs around reader goals

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/guides/getting-started.md`
- Modify: `docs/guides/composition-selection.md`

1. Add purpose-based index links while retaining all existing public docs.
2. Link the existing getting-started and composition-selection pages to the concepts and walkthrough guides.
3. Preserve current release truth and do not make TypeChain responsible for application policy or operations.
4. Run the contract plus `test/tool.test.mjs`, `test/policy-guard.test.mjs`, `test/langchain-adapter.test.mjs`, `test/agent.test.mjs`, and `test/typemcp.test.mjs`.

## Task 4: Verify and hand off the canonical source change

**Files:**
- No further production files.

1. Record exact RED/GREEN evidence in the issue/PR body.
2. Run `npm run verify`, `npm run verify:publish`, and `git diff --check`.
3. Commit, push, and open a `dev` PR with `Closes #78`.
4. Request latest-head independent review. The website source pin waits for this branch’s reviewed canonical-main promotion.
