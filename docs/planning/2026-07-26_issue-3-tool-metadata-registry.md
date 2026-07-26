# Tool Metadata Registry Implementation Plan

> **For Hermes:** Execute this plan with test-first development: each behavior test must fail for the intended missing behavior before production code is added.

**Goal:** Provide a small standard-TypeScript decorator layer that records explicit `@Tool()` method metadata and collects it from a concrete instance.

**Architecture:** `@Tool()` uses a Stage 3 method decorator and `context.addInitializer()` to register immutable definitions against the instance constructor. `getToolDefinitions(instance)` returns a frozen snapshot of the definitions registered for that concrete instance's class. The module does not import LangChain or parse schemas; a future adapter will consume these definitions to call LangChain's `tool()`.

**Tech stack:** TypeScript 5 standard decorators, Node built-in test runner, Biome, `tsc`.

---

## Contract: A/E/X cases

| Class | Case | Expected result |
| --- | --- | --- |
| A | A public instance method has explicit portable name, description, and non-null runtime schema. | `getToolDefinitions(instance)` returns one immutable definition bound to that method. |
| E | Two decorated methods on one class use different valid names. | Definitions retain declaration order and each method is callable with its original instance receiver. |
| E | A derived instance inherits decorated methods. | Collection includes inherited definitions once, before definitions declared on the derived class. |
| X | `schema` is omitted, `undefined`, or `null`. | Decorator throws during class definition. |
| X | Name is not lower snake case. | Decorator throws during class definition. |
| X | Decorator is attached to static, private, or non-method element. | Decorator throws during class definition. |
| X | Duplicate names are registered for the same instance. | Construction throws a duplicate-name error. |

## Task 1: Add the public contract and failing behavior tests

**Files:**
- Create: `src/tool.ts`
- Modify: `src/index.ts`
- Create: `test/tool.test.mjs`

1. Write `test/tool.test.mjs` against the desired package API: `Tool` and `getToolDefinitions`.
2. Cover a valid method, bound method receiver, schema reference preservation, inherited definitions, invalid name/schema/target, duplicate name, and frozen snapshots.
3. Run `node --test test/tool.test.mjs`.
4. Confirm failure is an import/export failure because the feature does not exist.

## Task 2: Implement minimal metadata registration

**Files:**
- Create: `src/tool.ts`
- Modify: `src/index.ts`

1. Define `ToolOptions`, `ToolDefinition`, and standard method decorator types.
2. Validate options at decoration time: name matches `^[a-z][a-z0-9_]*$`, description is non-empty, and schema is neither `null` nor `undefined`.
3. Reject static, private, and non-method elements.
4. Register definition metadata using `context.addInitializer()` and a constructor-keyed `WeakMap`.
5. Implement `getToolDefinitions(instance)` to traverse constructors from base to derived, check duplicate names, bind methods to the instance, and return frozen definitions and a frozen array.
6. Run the focused tests and confirm pass.

## Task 3: Verify integration and document the shipped boundary

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/planning/2026-07-26_issue-3-tool-metadata-registry.md`

1. Add a truthful minimal `@Tool()` example and clearly state that it is metadata-only—not yet a LangChain tool adapter or schema executor.
2. Update architecture status/scope to mark the metadata registry as shipped on the development branch only.
3. Run `npm run verify`, `npm run verify:publish`, `npm audit --audit-level=low`, and `git diff --check`.
4. Commit the plan and implementation with separate focused commits where practical.

## Delivery

Open one PR from `feat/3-tool-metadata-registry` to `dev` using `Closes #3`. Because the repository is private on GitHub Free, manually capture passing CI, all resolved threads, exact current head SHA, and independent review before merge. Do not merge without explicit owner authorization.
