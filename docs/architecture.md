# Architecture: Decorator-first LangChain JS authoring

## Status

The development branch provides a metadata registry and a LangChain Core tool adapter. Agent builders and runtime policy enforcement are not shipped.

## Current implementation

`@Tool()` records explicit name, description, and runtime-schema metadata for a public instance method; `getToolDefinitions(instance)` returns immutable, receiver-bound definitions. `toLangChainTools(instance)` passes each definition to LangChain Core's `tool()` factory, preserving the declared schema and receiver-bound invocation. Input parsing and validation remain LangChain Core's responsibility.

## Intended scope

The next layer will collect adapted tools for explicit `createAgent()` construction. Policy metadata will be passed to runtime middleware/guards for real enforcement.

## Non-goals

- Reimplementing LangChain, LangGraph, or provider SDKs.
- Inferring runtime schemas from TypeScript parameter types.
- Treating metadata as authorization or execution.
- Hiding `ToolRuntime`, streaming, commands, state, or errors.
- Auto-generating unreviewed RAG or multi-agent graphs.

## Core boundaries

| Boundary | Contract |
| --- | --- |
| Declaration metadata | Name, description, runtime schema, and policy intent only. |
| Instance binding | Binds a method to one real dependency-injected object. |
| LangChain adapter | Produces a standard LangChain tool with declared schema. |
| Runtime policy | Enforces authorization, approval, retries, timeout, redaction, audit, and idempotency. |
| Application host | Supplies models, state, credentials, persistence, and deployment policy. |

Tool names are explicit, portable, and unique; prefer `snake_case`. Every public API needs runtime tests, type-level tests when inference matters, integration coverage against supported LangChain JS, and compatibility review.
