# Choose a TypeChain composition boundary

> **Release status:** This guide documents the published `@theorvane/type-chain@0.1.1` package. Every optional integration stays behind a dedicated subpath, so importing the root metadata package does not load LangChain or TypeMCP peers.

TypeChain makes tool and policy declarations explicit, then adapts those declarations at a boundary selected by the application. Start with the narrowest import that reaches the behavior you need. The application keeps ownership of models, credentials, authorization, enforcement, state, persistence, streaming, hosting, and deployment.

## Before you start

- Node.js 20 or later
- A project that has completed [Petstore TypeChain foundation](petstore-typechain-foundation.md) when following the project-starting curriculum
- An application-owned decision for whether the next boundary is root-only, LangChain, agent, or in-process TypeMCP

## Workspace checkpoint

This is the routing chapter after an inspected root definition. It is not a second foundation: complete the foundation guide for `tsconfig.json`, `@types/node`, and the first named files before selecting an optional subpath.

## Install

Install the root package first:

```bash
npm install @theorvane/type-chain@0.1.1
```

| Need | Import | Use it when | Keep in the application |
| --- | --- | --- | --- |
| Declare tools and policy intent | `@theorvane/type-chain` | Application code needs immutable, receiver-bound tool definitions. | Actual authorization, approval, audit, retry, timeout, idempotency, and redaction decisions. |
| Pass tools to an existing LangChain composition | `@theorvane/type-chain/langchain` | The application already owns a LangChain model or agent boundary. | Model/provider selection, agent lifecycle, state, streaming, and graph topology. |
| Build a direct LangChain agent from a decorated class | `@theorvane/type-chain/agent` | A small application-owned agent boundary is appropriate. | Model instance, credentials, all runtime controls, and deployment. |
| Adapt an in-process TypeMCP server | `@theorvane/type-chain/typemcp` | TypeMCP-decorated tools and the LangChain application run in the same Node.js process. | MCP transport hosting, resolver dependencies, clients, policy, and cross-process access. |

The root package has no required optional peer imports. Install only the peers for the subpath selected by the application:

```bash
# Standard LangChain tool or agent composition
npm install @theorvane/type-chain@0.1.1 @langchain/core langchain zod

# In-process TypeMCP composition
npm install @theorvane/type-chain@0.1.1 @theorvane/type-mcp@0.2.2 @langchain/core langchain zod
```

## Begin with one declared tool

A root import records explicit runtime metadata and returns definitions bound to a real application instance. It does not infer schemas from TypeScript types or execute an authorization decision.

```ts
// src/catalog-tools.ts
import { z } from "zod";
import { Policy, Tool } from "@theorvane/type-chain";

export class CatalogTools {
  @Policy({ authorization: "required", audit: "required" })
  @Tool({
    name: "find_product",
    description: "Find a product by SKU.",
    schema: z.object({ sku: z.string().min(1) }),
  })
  findProduct({ sku }: { readonly sku: string }) {
    return { sku, available: true };
  }
}
```

`@Tool()` captures a name, description, and runtime schema. `@Policy()` captures declarative intent. Neither decorator chooses who is authorized, records an audit entry, retries a call, or provides a timeout. Those are runtime effects that belong to application middleware or a supplied guard.

## Use an existing LangChain composition

Import the LangChain adapter when the application already owns the model and the surrounding agent or graph.

```ts
import { toLangChainTools } from "@theorvane/type-chain/langchain";
import { CatalogTools } from "./catalog-tools.js";

const tools = toLangChainTools(new CatalogTools());
```

`toLangChainTools()` creates standard LangChain structured tools. It requires a structured object input schema accepted by LangChain’s `tool()` factory. LangChain owns input parsing and validation at this adapter boundary; TypeChain preserves the declared schema and receiver-bound method invocation.

When a tool declares `@Policy()`, compose an application-owned guard before adapting it:

```ts
import { toGuardedLangChainTools } from "@theorvane/type-chain/langchain";

const tools = toGuardedLangChainTools(new CatalogTools(), async ({
  definition,
  policy,
  input,
}) => {
  await applicationPolicyMiddleware({ definition, policy, input });
});
```

Throwing or rejecting from the guard prevents the underlying policy-decorated method from running. TypeChain provides no default allow or deny result. Read [Policy and guards](policy.md) before exposing a state-changing method.

## Build a direct agent when the application owns the model

The agent subpath is a small bridge to LangChain’s `createAgent()`. Decorate the class with `@Agent()` and supply the model from the application.

```ts
import { Agent, buildAgent } from "@theorvane/type-chain/agent";
import { CatalogTools } from "./catalog-tools.js";

@Agent({ systemPrompt: "Use catalog tools only when they answer the request." })
class CatalogAgent extends CatalogTools {}

const agent = buildAgent(new CatalogAgent(), {
  model: applicationOwnedModel,
});
```

`buildAgent()` adapts the decorated tools and delegates construction to LangChain. The caller selects `applicationOwnedModel`; provider credentials, tracing, state, persistence, streaming, error handling, and deployment do not become TypeChain responsibilities. Use `buildGuardedAgent()` when the application must run a guard for tools that declare policy intent.

## Compose TypeMCP only inside one Node.js process

The TypeMCP bridge is not an MCP host or client. It converts a TypeMCP-decorated server into native LangChain tools, then may delegate those tools to LangChain’s `createAgent()`.

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

The TypeMCP-decorated server must keep a zero-argument constructor under the published `0.2.2` `@McpServer` contract. The resolver configures application dependencies before conversion; the explicit resolver remains application-owned. TypeMCP validates the MCP declaration and resolves the server instance; TypeChain adapts the resulting tools; LangChain owns agent construction. No stdio or HTTP transport is started. Use TypeMCP’s transport hosts separately when tools must be accessed across process boundaries.

## Run and verify

Use the root-only checkpoint first:

```bash
npm run check
npm run inspect-tools
```

Then select one extension and run only the matching local contract:

```bash
# Existing LangChain composition
node --test test/langchain-adapter.test.mjs

# Direct application-owned agent with a caller-supplied model
node --test test/agent.test.mjs

# In-process TypeMCP conversion; this does not start MCP stdio or HTTP
node --test test/typemcp.test.mjs
```

These commands verify adapters without a provider call or public host. Your application must still test its own model, guard, resolver dependencies, credentials, and deployment configuration.

## Expected behavior

The root path records immutable definitions without optional peer imports. Each selected subpath adds only its stated adapter: LangChain tools, a caller-model agent bridge, or an in-process TypeMCP conversion. No route starts a network listener or turns policy metadata into authorization automatically.

## Failure guide

- **A subpath import cannot resolve:** install only the peer group shown for that subpath and retain the root-only import in unrelated files.
- **A policy-decorated action runs without enforcement:** choose a guarded adapter and supply an application guard; `@Policy()` records intent rather than an allow/deny result.
- **A separate process needs MCP access:** choose a TypeMCP stdio or HTTP host in that application. The `/typemcp` adapter is intentionally in-process.

## Responsibility boundary

TypeChain owns explicit tool/policy metadata and the selected adapter. The application owns model/provider selection, credentials, authorization and enforcement, persistence/state, host lifecycle, cross-process transport, observability, retry/timeout behavior, and deployment.

## Next steps

- [Petstore TypeChain foundation](petstore-typechain-foundation.md) starts a strict workspace with an inspected root tool definition.
- [Petstore policy and composition](petstore-policy-and-composition.md) records policy intent and then selects exactly one optional integration.
- [Petstore walkthrough](petstore-walkthrough.md) is the compact route map for the same catalog scenario.
- [Tools and definitions](tools-and-definitions.md) explains immutable definitions and inheritance rules.
- [Policy and guards](policy.md) describes declarative policy metadata and application-owned enforcement.
- [LangChain integration](langchain-integration.md) covers standard structured-tool adaptation.
- [Agent builder](agent-builder.md) details direct agent construction and guarded agents.
- [TypeMCP bridge](typemcp-bridge.md) explains the in-process TypeMCP composition boundary.
- [Decorator API contract](../api/decorator-api.md) lists every public `0.1.1` import surface.

The selected subpath should match the integration boundary, not the product label. Use the root package for declarations, the LangChain adapter for existing LangChain composition, the agent bridge only when the application owns a model, and the TypeMCP bridge only for in-process composition.
