# Architecture: Decorator-first LangChain JS authoring

## Status

The development branch exposes a metadata registry and optional LangChain adapters. Import `type-chain/langchain` for decorated tools, `type-chain/agent` for the direct `@Agent()` builder, or `type-chain/typemcp` for in-process TypeMCP composition. Root metadata imports stay independent of optional peers; TypeChain does not enforce runtime policy.

## Current implementation

`@Tool()` records explicit name, description, and runtime-schema metadata for a public instance method; `getToolDefinitions(instance)` returns immutable, receiver-bound definitions. `toLangChainTools(instance)` passes each definition to LangChain Core's `tool()` factory, preserving the declared schema and receiver-bound invocation. Input parsing and validation remain LangChain Core's responsibility.

## TypeMCP in-process bridge

`type-chain/typemcp` is an optional composition boundary for a TypeMCP-decorated server that lives in the same Node.js process as a LangChain application:

```text
external API client → @McpTool server + explicit resolver
                    → TypeMCP createLangChainTools()
                    → TypeChain createTypeMcpAgent()
                    → LangChain createAgent()
```

The bridge delegates schema validation, metadata interpretation, and resolver behavior to TypeMCP. It delegates agent construction to LangChain. It deliberately does not open HTTP/stdio transports, implement MCP client/session behavior, supply API credentials, or enforce authorization, approval, retries, timeouts, auditing, or redaction. An application needing cross-process MCP access uses TypeMCP's transport hosts independently.

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
