# TypeChain documentation

TypeChain is a decorator-first authoring layer for typed LangChain JS tools and agents. The published package is [`@theorvane/type-chain@0.1.1`](https://www.npmjs.com/package/@theorvane/type-chain).

> **Published boundary:** TypeChain provides Stage 3 tool and policy declarations, immutable definitions, LangChain adaptation, an agent builder, and an in-process TypeMCP bridge. Applications retain ownership of **models, credentials, policy enforcement, state, hosting, deployment, and cross-process MCP transport**.

## Start with a goal

| Goal | Read this | Published surface |
| --- | --- | --- |
| **Define tools** with explicit schema metadata | [Core concepts](guides/core-concepts.md) | `@Tool()` and `getToolDefinitions()` |
| **Enforce a policy** before a state-changing tool | [Policy and guards](guides/policy.md) | `@Policy()` and application-supplied guard |
| **Reuse with LangChain** in an existing composition | [LangChain integration](guides/langchain-integration.md) | `@theorvane/type-chain/langchain` |
| **Build an agent** from a caller-supplied model | [Agent builder](guides/agent-builder.md) | `@theorvane/type-chain/agent` |
| **Bridge TypeMCP in process** | [TypeMCP bridge](guides/typemcp-bridge.md) | `@theorvane/type-chain/typemcp` |
| Follow one compact catalog example | [Petstore walkthrough](guides/petstore-walkthrough.md) | root package plus selected optional subpath |
| Inspect every export and exclusion | [Decorator API contract](api/decorator-api.md) | semver-governed API reference |

## Core library concepts

1. **Tool metadata** — `@Tool()` records an explicit public name, description, and runtime schema on a public instance method.
2. **Immutable definitions** — `getToolDefinitions()` returns frozen, receiver-bound definitions so downstream adapters call the right application instance.
3. **Policy intent** — `@Policy()` documents requirements such as authorization, approval, audit, retry, or timeout; it does not enforce them.
4. **Optional boundaries** — select a LangChain adapter, agent builder, or TypeMCP bridge only where the application needs that integration.

Read [core concepts](guides/core-concepts.md) first. The [Petstore walkthrough](guides/petstore-walkthrough.md) then uses one `find_product` tool to connect declarations, a supplied guard, and the optional integration choices.

## Guides

### Start

- [Getting started](guides/getting-started.md) — install, configure Stage 3 decorators, and declare a first tool.
- [Core concepts](guides/core-concepts.md) — metadata, runtime schemas, policy intent, optional subpaths, and ownership boundaries.
- [Petstore walkthrough](guides/petstore-walkthrough.md) — a compact catalog flow from tool declaration to selected composition.

### Integrations

- [Tools and definitions](guides/tools-and-definitions.md) — explicit `@Tool()` contract and inheritance.
- [Policy and guards](guides/policy.md) — declarative intent and application-owned enforcement.
- [LangChain integration](guides/langchain-integration.md) — standard structured-tool adaptation.
- [Agent builder](guides/agent-builder.md) — a small bridge to LangChain `createAgent()`.
- [TypeMCP bridge](guides/typemcp-bridge.md) — in-process TypeMCP-to-LangChain composition.
- [Choose a composition boundary](guides/composition-selection.md) — select the smallest import for the integration you own.

### Reference

- [Decorator API contract](api/decorator-api.md) — root and optional subpath exports, contracts, and exclusions.
- [Architecture](architecture.md) — decorator-first authoring architecture.

## Documentation status convention

- **Implemented**: present in merged code and verified by tests.
- **Planned**: approved behavior that is not merged or published.
- **Deferred**: explicitly outside the current package boundary.

Planning documents remain under `docs/planning/`. They are design history, not proof that an API is installed; use the published boundary above and the API contract before adopting a capability.
