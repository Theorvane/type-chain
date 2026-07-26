# Architecture: Decorator-first LangChain JS authoring

## Status

This is a design boundary, not an implementation claim. No decorator, tool adapter, agent builder, or LangChain integration is shipped.

## Intended scope

TypeChain will record decorated method metadata, bind it to a dependency-injected instance, adapt the bound method to LangChain `tool()` using an explicit runtime schema, and collect tools for explicit `createAgent()` construction. Policy metadata is passed to runtime middleware/guards for real enforcement.

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
