# Internal TypeMCP + LangChain Bridge Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Provide an optional `type-chain/typemcp` entrypoint that composes published TypeMCP tools into a caller-configured LangChain agent in-process.

**Architecture:** The subpath imports TypeMCP's published `createLangChainTools()` adapter and LangChain's `createAgent()`. It forwards an explicit TypeMCP server constructor/resolver pair, returns native LangChain tools, and adds no transport, model, policy, or external-client behavior. The root package entrypoint remains independent from this integration.

**Tech Stack:** TypeScript Stage 3 decorators, Node test runner, `@theorvane/type-mcp`, `@langchain/core`, `langchain`, Zod, Biome.

**Design source:** `docs/planning/2026-07-26-internal-typemcp-langchain-bridge-design.md`

---

### Task 1: Add the optional bridge dependency/export contract

**Objective:** Make the bridge consumable only through a dedicated package subpath without coupling the root entrypoint to TypeMCP.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `scripts/verify-package.mjs`

**Step 1: Write failing package/export assertions**

Add checks that `package.json` exports `./typemcp` and declares compatible optional peer metadata for `@theorvane/type-mcp` and `langchain`.

**Step 2: Run the package check to verify failure**

Run: `npm run verify:package`

Expected: FAIL because `./typemcp` and its peer dependency declarations do not exist.

**Step 3: Add the minimum package metadata**

- Add `./typemcp` ESM/types export mapping.
- Declare `@theorvane/type-mcp`, `langchain`, and `@langchain/core` as optional peer dependencies for bridge consumers.
- Install development copies pinned to the supported TypeMCP/LangChain versions for integration tests.

**Step 4: Run the package check to verify pass**

Run: `npm run verify:package`

Expected: PASS.

**Step 5: Commit**

```bash
git add package.json package-lock.json scripts/verify-package.mjs
git commit -m "chore: declare TypeMCP bridge entrypoint"
```

### Task 2: Add the TypeMCP tool-composition helper

**Objective:** Expose a thin helper that delegates TypeMCP server compilation to its published LangChain adapter.

**Files:**
- Create: `src/typemcp.ts`
- Test: `test/typemcp.test.mjs`

**Step 1: Write failing integration test**

Use a real `@McpServer` / `@McpTool` class with a resolver-injected fake external API client. Assert that `createTypeMcpLangChainTools()` returns an invocable native LangChain tool, preserves Zod validation, and uses the resolved instance.

**Step 2: Run the focused test to verify failure**

Run: `npm run build && node --test test/typemcp.test.mjs`

Expected: FAIL because `type-chain/typemcp` and `createTypeMcpLangChainTools()` do not exist.

**Step 3: Implement the smallest bridge helper**

Import `createLangChainTools` and TypeMCP's options type from `@theorvane/type-mcp/langchain`; forward the constructor/options unchanged.

**Step 4: Run the focused test to verify pass**

Run: `npm run build && node --test test/typemcp.test.mjs`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/typemcp.ts test/typemcp.test.mjs
git commit -m "feat: compose TypeMCP tools in process"
```

### Task 3: Add the LangChain agent-composition helper

**Objective:** Build an agent from caller-supplied model/options and TypeMCP-generated tools without hiding runtime ownership.

**Files:**
- Modify: `src/typemcp.ts`
- Modify: `test/typemcp.test.mjs`
- Test: `type-tests/typemcp.ts`

**Step 1: Write failing agent test**

Use LangChain's in-memory fake tool-calling model. Assert `createTypeMcpAgent()` causes a tool call against the decorated external-API wrapper and that the final response includes the tool result.

**Step 2: Run the focused test to verify failure**

Run: `npm run build && node --test test/typemcp.test.mjs`

Expected: FAIL because `createTypeMcpAgent()` does not exist.

**Step 3: Implement the minimal agent builder**

Await the TypeMCP tool helper, then delegate to LangChain's `createAgent()` with the caller model, generated tools, and explicitly supplied agent options.

**Step 4: Add type-level usage coverage**

Compile a Stage 3-decorated TypeMCP server sample using the bridge to prevent public signature regressions.

**Step 5: Run focused test/typecheck to verify pass**

Run:

```bash
npm run typecheck
npm run build && node --test test/typemcp.test.mjs
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/typemcp.ts test/typemcp.test.mjs type-tests/typemcp.ts
git commit -m "feat: build LangChain agents from TypeMCP tools"
```

### Task 4: Document consumer boundaries and verify a packed consumer

**Objective:** Turn the saved design into user-facing, source-backed documentation and ensure the subpath works from the generated package.

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Create: `docs/guides/internal-typemcp-langchain.md`
- Modify: `scripts/verify-package.mjs` if package assertions need extending

**Step 1: Write/extend a consumer smoke script that fails without the bridge export**

Install the packed tarball plus declared peers in a temporary directory. Compile and run a small TypeMCP-decorated external-API wrapper that creates in-process LangChain tools (and, if deterministic with available fake model exports, an agent).

**Step 2: Run it to verify the current behavior**

Run the new smoke command before final package changes are complete; expected failure should identify the missing/incorrect bridge export or peer contract.

**Step 3: Write consumer documentation**

Document:
- install command and optional peers;
- the `@McpServer` / `@McpTool` external API wrapper pattern;
- `createTypeMcpLangChainTools()` and `createTypeMcpAgent()` examples;
- exact boundary: in-process only, no MCP HTTP/stdio transport;
- consumer ownership of model, credentials, API client policy, authorization, approval, audits, retry, timeout, and persistence;
- link back to the canonical design document.

**Step 4: Run full verification**

Run:

```bash
npm run verify
npm run verify:publish
npm audit --audit-level=low
git diff --check
```

Expected: all commands pass and audit reports no vulnerabilities.

**Step 5: Commit**

```bash
git add README.md docs/architecture.md docs/guides/internal-typemcp-langchain.md scripts/verify-package.mjs
git commit -m "docs: explain internal TypeMCP composition"
```

### Task 5: Issue/PR delivery

**Objective:** Deliver the feature through the repository's manual governance gates.

**Files:** No code changes expected.

**Step 1: Push and open a PR against `dev`**

Use a PR body that includes `Closes #11`, the design document path, exact validation commands/results, dependency boundary, and non-goals.

**Step 2: Apply labels and assignment**

Apply `enhancement`, `area:langchain`, `area:agents`, and a size label if present; assign `sjungwon03`.

**Step 3: Request exact-HEAD independent review**

Request `sjungwon03-ai`, rerun GitHub CI, resolve all review threads, and verify the approval commit matches the final PR head.

**Step 4: Merge only after gates pass**

Confirm current PR head, CI, labels, assignee, linked issue, review thread state, and independent review before squash merging to `dev`.
