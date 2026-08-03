# Decorator API contract

`@theorvane/type-chain@0.2.1` is the current public TypeChain release. It supports standard TypeScript Stage 3 decorators and explicit runtime schemas. It does not infer schemas from TypeScript parameter types or use legacy `reflect-metadata` behavior.

## Root package

```ts
import {
  Policy,
  Tool,
  getToolDefinitions,
  withToolPolicyGuard,
} from "@theorvane/type-chain";
```

The root package exposes metadata and policy APIs with no required optional peer imports.

### @Tool(options)

```ts
@Tool({
  name: "portable_snake_case_name",
  description: "A non-empty tool description.",
  schema: runtimeSchema,
})
```

| Option | Type | Contract |
| --- | --- | --- |
| `name` | `string` | Portable snake case, beginning with a lowercase letter. |
| `description` | `string` | Non-empty human-readable description. |
| `schema` | `object` | Explicit, non-null runtime schema object. |

The decorator applies only to public, non-static instance methods. A decorated class hierarchy must not expose duplicate tool names.

### getToolDefinitions(instance)

```ts
const definitions = getToolDefinitions(instance);
```

Returns a frozen array of receiver-bound `ToolDefinition` values:

```ts
interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly schema: object;
  readonly policy: Readonly<ToolPolicy> | undefined;
  readonly invoke: (input: unknown) => unknown;
}
```

### @Policy(policy)

```ts
@Policy({
  authorization: "required",
  approval: "required",
  audit: "required",
  idempotency: "required",
  timeoutMs: 5_000,
  retry: { maxAttempts: 3 },
})
```

All fields are optional, but the object must contain at least one. `@Policy()` records immutable declarative intent only. It does not enforce policy.

### withToolPolicyGuard(instance, guard)

```ts
const guarded = withToolPolicyGuard(instance, async ({ definition, policy, input }) => {
  await applicationOwnedEnforcement({ definition, policy, input });
});
```

`guard` is a function that may return `void` or a promise. Throw or reject to stop an invocation for a tool with declared policy. Tools without declared policy retain direct invocation behavior.

## LangChain subpath

```ts
import {
  toGuardedLangChainTools,
  toLangChainTools,
} from "@theorvane/type-chain/langchain";
```

- `toLangChainTools(instance)` returns standard LangChain structured tools.
- `toGuardedLangChainTools(instance, guard)` applies the application-owned policy guard before policy-decorated invocation.

The adapter requires structured object input schemas supported by LangChain's `tool()` factory. It does not select a model or own agent state.

## Agent subpath

```ts
import {
  Agent,
  buildAgent,
  buildGuardedAgent,
} from "@theorvane/type-chain/agent";
```

- `@Agent({ systemPrompt? })` records an optional, non-empty system prompt on a class.
- `buildAgent(instance, { model })` builds a LangChain agent from decorated tools.
- `buildGuardedAgent(instance, { model, guard })` does the same with application-owned policy enforcement.

The caller supplies the LangChain model and owns provider credentials, lifecycle, state, persistence, errors, streaming, and deployment.

## TypeMCP subpath

```ts
import {
  createGuardedTypeMcpAgent,
  createGuardedTypeMcpLangChainTools,
  createTypeMcpAgent,
  createTypeMcpLangChainTools,
} from "@theorvane/type-chain/typemcp";
```

These APIs compose a TypeMCP-decorated server into native LangChain tools and agents in the current process. They require a TypeMCP server class and an explicit resolver. The guarded variants call an application-owned guard after TypeMCP/LangChain validation and before resolver-backed invocation.

They do not open a TypeMCP HTTP or stdio transport, create MCP clients or sessions, supply credentials, or make authorization decisions.

## Legacy CJS decorators

`@theorvane/type-chain/legacy` is the compatibility entrypoint for legacy
TypeScript decorators in CommonJS applications. It exports `Tool`, `Policy`,
`Agent`, `getToolDefinitions`, `toLangChainTools`, and `buildAgent`. Its
metadata and validation contracts match the Stage 3 APIs, while LangChain
adaptation and agent construction are asynchronous because the optional
LangChain dependencies are loaded only at runtime.

```ts
import { Agent, Policy, Tool } from "@theorvane/type-chain/legacy";

@Agent({ systemPrompt: "Use approved tools." })
class LegacyTools {
  @Tool({ name: "search_issues", description: "Search repository issues.", schema: { type: "object" } })
  @Policy({ authorization: "required" })
  search(input: { readonly query: string }) {
    return input.query;
  }
}
```

Use `"module": "Node16"`, `"moduleResolution": "Node16"`, and
`"experimentalDecorators": true` for CommonJS consumers. In the same Node16
compilation, static imports of the root, `/langchain`, `/agent`, and `/typemcp`
subpaths select their CJS `.d.cts` declarations and `.cjs` runtime exports.
Install the relevant optional peers (`@langchain/core`, `langchain`, and/or
`@theorvane/type-mcp`) for any subpath you import. Legacy support is
limited to public instance methods with string names; parameter, accessor,
field, private, and symbol-named decorators are excluded. Do not mix Stage 3
and legacy decorators in one TypeScript compilation unit.

## Package boundary

| Import | Responsibility |
| --- | --- |
| `@theorvane/type-chain` | Tool and policy metadata, immutable definitions, policy guard wrapper. |
| `@theorvane/type-chain/langchain` | Standard LangChain structured-tool adaptation. |
| `@theorvane/type-chain/agent` | Decorator-first LangChain `createAgent()` bridge. |
| `@theorvane/type-chain/typemcp` | In-process TypeMCP-to-LangChain composition. |

For complete examples, read [Getting started](../guides/getting-started.md) and the related integration guides.
