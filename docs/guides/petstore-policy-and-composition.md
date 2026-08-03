# Petstore policy and composition: record intent, then select one boundary

This chapter continues the [Petstore TypeChain foundation](petstore-typechain-foundation.md). It adds policy metadata for a state-changing operation and shows the three optional integration boundaries without turning TypeChain into a model, policy engine, host, or MCP client.

## Before you start

- Complete [Petstore TypeChain foundation](petstore-typechain-foundation.md) and confirm `npm run check` and `npm run inspect-tools` work.
- Node.js 20 or later with `@theorvane/type-chain@0.2.0` and `zod` installed.
- Select **one** optional route only after the root declaration is useful: `/langchain`, `/agent`, or `/typemcp`.

## Workspace checkpoint

After the policy step, the workspace adds:

```text
petstore-workspace/
└── src/
    ├── petstore-admin-tools.ts
    └── policy-guard.ts
```

Optional routes can add `langchain-tools.ts`, `petstore-agent.ts`, or `typemcp-tools.ts`. They are alternatives, not a stack that every application must import.

## Install

The policy metadata itself needs only the root package and Zod:

```bash
npm install @theorvane/type-chain@0.2.0 zod
npm run check
```

Install optional peers only when selecting one route:

```bash
# Existing LangChain composition or a direct application-owned agent
npm install @langchain/core langchain

# In-process TypeMCP bridge
npm install @theorvane/type-mcp@0.3.0 @langchain/core langchain
```

## Record policy intent

Create `src/petstore-admin-tools.ts`:

```ts
import { z } from "zod";
import { Policy, Tool } from "@theorvane/type-chain";

import type { PetstoreClient } from "./petstore-client.js";

export class PetstoreAdminTools {
  constructor(private readonly client: PetstoreClient) {}

  @Policy({ authorization: "required", audit: "required" })
  @Tool({
    name: "update_product",
    description: "Update one Petstore product.",
    schema: z.object({ sku: z.string().min(1) }),
  })
  updateProduct({ sku }: { readonly sku: string }) {
    return this.client.findProduct(sku);
  }
}
```

`@Policy()` records declarative intent next to `@Tool()`. It does **not** automatically authorize a caller, write an audit event, retry a call, or select an approval mechanism.

Create `src/policy-guard.ts` when a selected adapter accepts a guard:

```ts
import type { ToolPolicyGuard } from "@theorvane/type-chain";

export const applicationPolicyGuard: ToolPolicyGuard = async ({
  definition,
  policy,
  input,
}) => {
  // Authenticate, authorize, log, or reject here in application code.
  await Promise.resolve({ definition, policy, input });
};
```

The placeholder does not grant access. Replace it with reviewed application middleware before exposing a state-changing tool.

## Choose one composition boundary

### Existing LangChain composition: `/langchain`

Create `src/langchain-tools.ts`:

```ts
import { toGuardedLangChainTools } from "@theorvane/type-chain/langchain";

import { PetstoreAdminTools } from "./petstore-admin-tools.js";
import { applicationPolicyGuard } from "./policy-guard.js";

declare const petstoreClient: ConstructorParameters<typeof PetstoreAdminTools>[0];

export const tools = toGuardedLangChainTools(
  new PetstoreAdminTools(petstoreClient),
  applicationPolicyGuard,
);
```

Use this when the application already owns its LangChain model, agent/graph composition, state, streaming, provider credentials, and deployment. The adapter creates standard structured tools; it does not choose any of those runtime concerns.

### Direct application-owned agent: `/agent`

Create `src/petstore-agent.ts`:

```ts
import { Agent, buildAgent } from "@theorvane/type-chain/agent";

import { PetstoreTools } from "./petstore-tools.js";

@Agent({ systemPrompt: "Use the Petstore tool for product lookups." })
class PetstoreAgent extends PetstoreTools {}

declare const petstoreClient: ConstructorParameters<typeof PetstoreTools>[0];
declare const applicationOwnedModel: Parameters<typeof buildAgent>[1]["model"];

export const agent = buildAgent(new PetstoreAgent(petstoreClient), {
  model: applicationOwnedModel,
});
```

The caller supplies the model and its credentials. Use a guarded agent variant when policy-decorated tools need the application guard. TypeChain delegates construction to LangChain; it is not a hosted agent platform.

### In-process TypeMCP bridge: `/typemcp`

Create `src/typemcp-tools.ts` only when the TypeMCP-decorated server and LangChain application are in the **same Node.js process**:

```ts
import { createTypeMcpLangChainTools } from "@theorvane/type-chain/typemcp";

import type { PetstoreClient } from "./petstore-client.js";
import { PetstoreServer } from "./petstore-server.js";

declare const petstoreClient: PetstoreClient;

export const tools = await createTypeMcpLangChainTools(PetstoreServer, {
  resolver: { resolve: () => new PetstoreServer().configure(petstoreClient) },
});
```

The released TypeMCP `@McpServer` contract requires a zero-argument decorated constructor. Configure the application-owned dependency through the explicit resolver rather than constructor injection. This bridge converts TypeMCP tools to native LangChain tools in process. It does not start stdio or HTTP, create an MCP client/session, or provide cross-process transport. Use TypeMCP’s own transport hosts when another process must reach an MCP server.

## Run and verify

Verify the root/policy source before adding an optional integration:

```bash
npm run check
npm run inspect-tools
```

For one selected adapter, read its matching guide and run the focused repository contract before adopting it:

- [LangChain integration](langchain-integration.md)
- [Agent builder](agent-builder.md)
- [TypeMCP bridge](typemcp-bridge.md)

## Expected behavior

The root path continues to print the immutable `find_product` definition. A `PetstoreAdminTools` definition includes policy metadata, while actual enforcement occurs only when application code supplies a guard at an adapter boundary. Optional routes produce adapter values only after their peer dependencies and application-owned inputs are present; none starts a listener or authorizes a user.

## Failure guide

- **An optional subpath cannot resolve:** install only its documented peers, then keep the import isolated to the file that selects that route.
- **A policy-decorated call runs without a guard:** use the guarded adapter/agent path and test that the application guard rejects before invocation. `@Policy()` alone is metadata.
- **A model or credential is missing:** construct it in application configuration; TypeChain does not provide a default provider or secret source.
- **Another process needs MCP access:** the `/typemcp` bridge is in-process only. Configure a TypeMCP stdio or HTTP host independently.

## Responsibility boundary

TypeChain records tool and policy metadata, adapts declared tools to selected optional surfaces, and offers a small LangChain agent bridge. You own models, credentials, authorization and approval enforcement, audit storage, retries, timeouts, idempotency, redaction, state, persistence, transport, hosting, and deployment.

## Next steps

Use the compact [Petstore walkthrough](petstore-walkthrough.md) as a route map, then choose [composition selection](composition-selection.md) for the complete import table. Consult [policy and guards](policy.md) before exposing any state-changing operation.
