# Getting started with @theorvane/type-chain@0.1.1

TypeChain is a decorator-first, type-safe authoring layer for LangChain JS tools and agents. It records explicit tool metadata, adapts it to standard LangChain tools, and leaves model choice, credentials, authorization, retries, timeouts, persistence, redaction, and audit policy to your application.

This guide installs the published package `@theorvane/type-chain@0.1.1`, configures Stage 3 decorators, and declares a first tool.

## Requirements

- Node.js 20 or later
- TypeScript with standard (Stage 3) decorators — do **not** enable the legacy `experimentalDecorators` mode for these examples

## Install

```bash
npm install @theorvane/type-chain
```

The root package has no required optional peers and can be imported on its own. LangChain and TypeMCP integrations live behind dedicated subpaths (`@theorvane/type-chain/langchain`, `/agent`, `/typemcp`) and only load their respective peers when you import them.

## Configure TypeScript

Use an ESM-aware, Node-targeted configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "ESNext.Decorators"],
    "strict": true,
    "verbatimModuleSyntax": true
  }
}
```

Leave `experimentalDecorators` off so the compiler emits standard Stage 3 decorators.

## Declare a first tool

```ts
import { z } from "zod";
import { Tool, getToolDefinitions } from "@theorvane/type-chain";

class CatalogTools {
  @Tool({
    name: "find_product",
    description: "Look up a product by id.",
    schema: z.object({ id: z.string() }),
  })
  findProduct(input: { id: string }) {
    return { id: input.id, available: true };
  }
}

const definitions = getToolDefinitions(new CatalogTools());
console.log(definitions.map((definition) => definition.name)); // ["find_product"]
```

`@Tool()` records an explicit `name`, `description`, and runtime `schema`. `getToolDefinitions()` returns immutable, receiver-bound definitions whose `invoke` calls your method on the instance.

## Turn it into a LangChain tool

```ts
import { toLangChainTools } from "@theorvane/type-chain/langchain";

const tools = toLangChainTools(new CatalogTools());
```

`toLangChainTools()` passes each definition to LangChain Core's `tool()` factory, preserving the declared schema and receiver-bound invocation. Input parsing and validation remain LangChain Core's responsibility.

## Next steps

- [Core concepts](./core-concepts.md) — metadata, immutable definitions, policy intent, and optional integration boundaries.
- [Petstore walkthrough](./petstore-walkthrough.md) — one catalog tool from declaration through a selected composition boundary.
- [Tools and definitions](./tools-and-definitions.md) — the `@Tool()` contract and `getToolDefinitions()`.
- [Policy](./policy.md) — declarative `@Policy()` intent and application-owned guards.
- [LangChain integration](./langchain-integration.md) — standard tools and agent composition.
- [Decorator API contract](../api/decorator-api.md) — the full published surface.
