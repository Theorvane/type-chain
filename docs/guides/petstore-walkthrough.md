# Petstore walkthrough: typed tools at the boundary you own

This walkthrough uses one Petstore catalog tool to show the published [`@theorvane/type-chain@0.2.1`](https://www.npmjs.com/package/@theorvane/type-chain) flow: declare an explicit tool, optionally attach policy intent, then choose a LangChain, agent, or in-process TypeMCP boundary.

> **What this does not do:** TypeChain does not choose models, credentials, policy enforcement, state, hosting, deployment, or cross-process MCP transport. Your application supplies those decisions.

## Before you start

- Node.js 20 or later
- TypeScript standard (Stage 3) decorators; do not enable legacy `experimentalDecorators`
- A real runtime schema such as Zod for a structured tool input

## Workspace checkpoint

For a project-starting route, complete [Petstore TypeChain foundation](petstore-typechain-foundation.md) first. This walkthrough is the continuation that adds policy intent and selects exactly one optional composition boundary.

## Install

Install the root package and Zod:

```bash
npm install @theorvane/type-chain@0.2.1 zod
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

A read-only lookup does not need policy metadata in this example. For a state-changing Petstore operation, create `src/petstore-admin-tools.ts`:

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

This records intent. It does not enforce authorization or write an audit event automatically. Supply a reviewed application guard that can reject before a policy-decorated tool executes; see [Policy and guards](policy.md).

## 3. Choose one composition boundary

### Reuse with LangChain

Install optional peers only for this path:

```bash
npm install @theorvane/type-chain@0.2.1 @langchain/core langchain zod
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

// Obtain this from your application's chosen LangChain model integration.
declare const applicationOwnedModel: Parameters<typeof buildAgent>[1]["model"];

export const agent = buildAgent(new PetstoreAgent(), {
  model: applicationOwnedModel,
});
```

`buildAgent()` delegates to LangChain's `createAgent()`. The caller supplies `applicationOwnedModel`, provider credentials, runtime policy, state, errors, and deployment. This is a convenience bridge, not a hosted agent platform.

### Bridge a TypeMCP server in process

When a TypeMCP-decorated Petstore server and the LangChain application live in the same Node.js process, install the bridge peers:

```bash
npm install @theorvane/type-chain@0.2.1 @theorvane/type-mcp@0.3.1 @langchain/core langchain zod
```

Create `src/petstore-server.ts`:

```ts
import { z } from "zod";
import { McpServer, McpTool } from "@theorvane/type-mcp";

type PetstoreClient = {
  findBySku(sku: string): Promise<unknown>;
};

@McpServer({ name: "petstore", version: "1.0.0" })
export class PetstoreServer {
  @McpTool({
    name: "find-product",
    description: "Find a Petstore product by SKU.",
    input: z.object({ sku: z.string().min(1) }),
  })
  findProduct({ sku }: { readonly sku: string }) {
    if (this.client === undefined) {
      throw new Error("Petstore client was not configured by the application.");
    }

    return this.client.findBySku(sku);
  }

  private client: PetstoreClient | undefined;

  configure(client: PetstoreClient) {
    this.client = client;
    return this;
  }
}
```

Create `src/typemcp-tools.ts`:

```ts
import { createTypeMcpLangChainTools } from "@theorvane/type-chain/typemcp";
import type { PetstoreClient } from "./petstore-client.js";
import { PetstoreServer } from "./petstore-server.js";

// Construct and authorize this client in the application composition root.
declare const petstoreClient: PetstoreClient;

export const tools = await createTypeMcpLangChainTools(PetstoreServer, {
  resolver: { resolve: () => new PetstoreServer().configure(petstoreClient) },
});
```

The TypeMCP-decorated class deliberately keeps a zero-argument constructor because that is the published `@McpServer` contract in `0.3.0`. The explicit resolver configures the application-owned client before conversion; keep that composition-root seam while preserving the TypeMCP declaration contract.

The resolver and `petstoreClient` remain application-owned. The bridge converts TypeMCP tools to native LangChain tools in process. It does not start stdio/HTTP, create an MCP client/session, or grant cross-process access. Use TypeMCP transport hosts separately when a client must reach another process.

## Expected behavior

The root declaration produces immutable TypeChain tool metadata. The LangChain path yields a standard structured tool, the agent path yields a LangChain agent only after the caller supplies a model, and the TypeMCP path yields in-process LangChain tools that resolve `PetstoreServer` with the application-owned client. None of these paths opens a listener or authorizes a user.

## Run and verify

The root definition can be inspected without a model, network listener, or credentials:

```bash
npm run check
npm run inspect-tools
```

For one optional continuation, compile the named file and run its corresponding repository contract:

```bash
# LangChain adapter: src/langchain-tools.ts
node --test test/langchain-adapter.test.mjs

# Agent bridge: src/petstore-agent.ts
node --test test/agent.test.mjs

# In-process TypeMCP bridge: src/typemcp-tools.ts
node --test test/typemcp.test.mjs
```

The contract commands prove the adapter behavior locally. They do not provide a model, create credentials, host a network listener, or replace application policy tests.

## Verify the pattern

The repository exercises the public boundaries without a live provider or network server:

```bash
node --test test/tool.test.mjs
node --test test/policy-guard.test.mjs
node --test test/langchain-adapter.test.mjs
node --test test/agent.test.mjs
node --test test/typemcp.test.mjs
```

In your application, test the domain result, application guard, model configuration, resolver dependencies, and credentials policy that TypeChain intentionally leaves outside its package boundary.

## Failure guide

- **An optional import cannot resolve:** install the peers only for the selected `/langchain`, `/agent`, or `/typemcp` route and keep the import outside root-only files.
- **A policy tool executes without a guard:** select a guarded application adapter and test rejection before the method call. `@Policy()` records intent; it does not enforce authorization.
- **Another process needs MCP access:** the `/typemcp` bridge is in-process only. Configure a TypeMCP host separately.

## Responsibility boundary

TypeChain records declarations and adapts tools at optional boundaries. Your application owns models, credentials, policy enforcement, state, hosting, deployment, and cross-process MCP transport, as well as retry, timeout, approval, redaction, and audit behavior.

## Next steps

- [Core concepts](core-concepts.md) — metadata, definitions, policy intent, and optional boundaries.
- [Choose a composition boundary](composition-selection.md) — decision table and exact imports.
- [Decorator API contract](../api/decorator-api.md) — public APIs and exclusions.
