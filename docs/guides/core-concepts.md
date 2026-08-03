# Core concepts

This page explains the published [`@theorvane/type-chain@0.2.0`](https://www.npmjs.com/package/@theorvane/type-chain) model before you select an optional integration.

> **Responsibility boundary:** TypeChain records declarations and adapts them at explicit boundaries. Applications retain ownership of **models, credentials, policy enforcement, state, hosting, deployment, and cross-process MCP transport**.

## Tool metadata uses an explicit runtime schema

`@Tool()` decorates a public instance method with a portable name, description, and real runtime schema:

```ts
import { z } from "zod";
import { Tool } from "@theorvane/type-chain";

export class PetstoreTools {
  @Tool({
    name: "find_product",
    description: "Find a Petstore product by SKU.",
    schema: z.object({ sku: z.string().min(1) }),
  })
  findProduct({ sku }: { readonly sku: string }) {
    return { sku, available: true };
  }
}
```

TypeScript parameter types do not become a runtime schema. Supply a structured object schema that an optional LangChain adapter can pass to LangChain's `tool()` factory.

## Definitions are immutable and bound to an instance

Read definitions from a concrete application instance:

```ts
import { getToolDefinitions } from "@theorvane/type-chain";
import { PetstoreTools } from "./petstore-tools.js";

const definitions = getToolDefinitions(new PetstoreTools());
console.log(definitions.map((definition) => definition.name));
// ["find_product"]
```

The returned array and definitions are frozen. Each definition's `invoke` is bound to the supplied instance, so adapters do not lose constructor-injected application dependencies.

## Policy records intent; a guard enforces it

Apply `@Policy()` to record requirements for a tool:

```ts
import { z } from "zod";
import { Policy, Tool } from "@theorvane/type-chain";

export class PetstoreAdminTools {
  @Policy({ authorization: "required", audit: "required" })
  @Tool({
    name: "update_product",
    description: "Update a Petstore product.",
    schema: z.object({ sku: z.string().min(1) }),
  })
  updateProduct({ sku }: { readonly sku: string }) {
    return { sku, updated: true };
  }
}
```

The decorator does not authorize a caller, write an audit record, retry a request, or enforce a timeout. Supply an application-owned guard through `withToolPolicyGuard()`, `toGuardedLangChainTools()`, a guarded agent builder, or a guarded TypeMCP bridge. A guard may reject and prevent the decorated method from running.

## Select the smallest optional boundary

| Need | Import | TypeChain provides | Application provides |
| --- | --- | --- | --- |
| Declare and inspect tools/policy | `@theorvane/type-chain` | metadata, immutable definitions, guard wrapper | actual policy decision, domain services, errors |
| Use structured tools in existing LangChain code | `@theorvane/type-chain/langchain` | adapter-generated tools | model, agent lifecycle, graph topology, state |
| Build a narrow agent bridge | `@theorvane/type-chain/agent` | `@Agent()` metadata and LangChain `createAgent()` bridge | model, credentials, policy, telemetry, deployment |
| Reuse a TypeMCP declaration in one process | `@theorvane/type-chain/typemcp` | TypeMCP-to-LangChain composition | resolver dependencies, MCP host/client, cross-process access |

The root package does not require optional peer imports. Install the peers only for the selected subpath. Read [Choose a composition boundary](composition-selection.md) for exact package commands and [the Petstore walkthrough](petstore-walkthrough.md) for a compact example.

## What to read next

- [Petstore walkthrough](petstore-walkthrough.md) — tool metadata, an optional guard, and integration choices.
- [Policy and guards](policy.md) — policy contract and enforcement seam.
- [LangChain integration](langchain-integration.md) — structured tools.
- [Decorator API contract](../api/decorator-api.md) — public root and subpath contracts.
