# Petstore walkthrough: typed tools at the boundary you own

This walkthrough uses one Petstore catalog tool to show the published [`@theorvane/type-chain@0.1.1`](https://www.npmjs.com/package/@theorvane/type-chain) flow: declare an explicit tool, optionally attach policy intent, then choose LangChain, agent, or in-process TypeMCP composition.

> **What this does not do:** TypeChain does not choose models, credentials, policy enforcement, state, hosting, deployment, or cross-process MCP transport. Your application supplies those decisions.

## Before you start

- Node.js 20 or later
- TypeScript standard (Stage 3) decorators; do not enable legacy `experimentalDecorators`
- A real runtime schema such as Zod for a structured tool input

Install the root package and Zod:

```bash
npm install @theorvane/type-chain zod
```

Use Node-aware TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "ESNext.Decorators", "DOM", "DOM.Iterable"],
    "strict": true,
    "verbatimModuleSyntax": true
  }
}
```

## 1. Define the Petstore tool

Create `src/petstore-tools.ts`:

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

`@Tool()` records the explicit name, description, and runtime schema. `getToolDefinitions(new PetstoreTools())` returns a frozen definition whose `invoke` runs the correct instance method. It does not select a model, validate a caller's identity, or expose an endpoint.

## 2. Record policy intent only when the action needs it

A read-only lookup does not need policy metadata in this example. For a state-changing Petstore operation, stack `@Policy()` on the same method:

```ts
import { Policy, Tool } from "@theorvane/type-chain";

@Policy({ authorization: "required", audit: "required" })
@Tool({
  name: "update_product",
  description: "Update a Petstore product.",
  schema: z.object({ sku: z.string().min(1) }),
})
updateProduct({ sku }: { readonly sku: string }) {
  return { sku, updated: true };
}
```

This records intent. It does not enforce authorization or audit automatically. Supply a reviewed application guard that can reject before a policy-decorated tool executes; see [Policy and guards](policy.md).

## 3. Choose one composition boundary

### Reuse with LangChain

Install optional peers only for this path:

```bash
npm install @theorvane/type-chain @langchain/core langchain zod
```

Create `src/langchain-tools.ts`:

```ts
import { toLangChainTools } from "@theorvane/type-chain/langchain";
import { PetstoreTools } from "./petstore-tools.js";

export const tools = toLangChainTools(new PetstoreTools());
```

TypeChain adapts the declared methods to standard LangChain structured tools. LangChain owns supported schema parsing. Your application owns the model, agent or graph composition, state, streaming, credentials, and deployment. For policy-decorated methods, use `toGuardedLangChainTools()` with an application-owned guard.

### Build a small application-owned agent

Create `src/petstore-agent.ts`:

```ts
import { Agent, buildAgent } from "@theorvane/type-chain/agent";
import { PetstoreTools } from "./petstore-tools.js";

@Agent({ systemPrompt: "Use the Petstore tool for product lookups." })
class PetstoreAgent extends PetstoreTools {}

export const agent = buildAgent(new PetstoreAgent(), {
  model: yourApplicationModel,
});
```

`buildAgent()` delegates to LangChain's `createAgent()`. The caller supplies `yourApplicationModel`, provider credentials, runtime policy, state, errors, and deployment. This is a convenience bridge, not a hosted agent platform.

### Bridge a TypeMCP server in process

When a TypeMCP-decorated Petstore server and the LangChain application live in the same Node.js process, install the bridge peers:

```bash
npm install @theorvane/type-chain @theorvane/type-mcp @langchain/core langchain zod
```

```ts
import { createTypeMcpLangChainTools } from "@theorvane/type-chain/typemcp";
import { PetstoreServer } from "./petstore-server.js";

export const tools = await createTypeMcpLangChainTools(PetstoreServer, {
  resolver: { resolve: () => new PetstoreServer(petstoreClient) },
});
```

The resolver and `petstoreClient` remain application-owned. The bridge converts TypeMCP tools to native LangChain tools in process. It does not start stdio/HTTP, create an MCP client/session, or grant cross-process access. Use TypeMCP transport hosts separately when a client must reach another process.

## Verify the pattern

The repository exercises the public boundaries without a live provider or network server:

```bash
node --test test/tool.test.mjs
node --test test/policy-guard.test.mjs
node --test test/langchain-adapter.test.mjs
node --test test/agent.test.mjs
node --test test/typemcp.test.mjs
```

In your application, test the domain result, application guard, model configuration, and credentials policy that TypeChain intentionally leaves outside its package boundary.

## Next steps

- [Core concepts](core-concepts.md) — metadata, definitions, policy intent, and optional boundaries.
- [Choose a composition boundary](composition-selection.md) — decision table and exact imports.
- [Decorator API contract](../api/decorator-api.md) — public APIs and exclusions.
