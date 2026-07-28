# Agent builder

The published `@theorvane/type-chain@0.1.1` `@theorvane/type-chain/agent` subpath provides a small decorator-first bridge to LangChain's `createAgent()`. The application provides the model and retains ownership of the agent lifecycle and all runtime controls.

## Declare an agent

```ts
import { z } from "zod";
import { Tool } from "@theorvane/type-chain";
import { Agent, buildAgent } from "@theorvane/type-chain/agent";

@Agent({ systemPrompt: "You help users locate products." })
class CatalogAgent {
  @Tool({
    name: "find_product",
    description: "Find a product by id.",
    schema: z.object({ id: z.string() }),
  })
  findProduct({ id }: { id: string }) {
    return { id, available: true };
  }
}

const agent = buildAgent(new CatalogAgent(), {
  model: yourApplicationModel,
});
```

`@Agent()` accepts an optional non-empty `systemPrompt`. `buildAgent()` requires an instance of a class decorated with `@Agent()` and adapts its `@Tool()` methods through `toLangChainTools()`.

## Build a guarded agent

When some tools declare policy intent, use `buildGuardedAgent()` and supply the enforcement hook:

```ts
import { buildGuardedAgent } from "@theorvane/type-chain/agent";

const agent = buildGuardedAgent(new CatalogAgent(), {
  model: yourApplicationModel,
  guard: async ({ definition, policy, input }) => {
    await enforceApplicationPolicy({ tool: definition.name, policy, input });
  },
});
```

The guard runs only for tools that declare `@Policy()`. Throw or reject to prevent the underlying method from running.

## What TypeChain does not own

The agent builder delegates actual construction to LangChain. Your application still owns:

- model selection and provider credentials;
- authorization, approval, audit, redaction, retries, and timeouts;
- conversation state, persistence, streaming, and error handling;
- graph topology, including any LangGraph composition;
- HTTP hosting, deployment, and observability.

Use the direct LangChain adapter when you prefer to create the agent yourself. Use the [`@theorvane/type-chain/typemcp`](./typemcp-bridge.md) bridge when the tools originate from a TypeMCP-decorated server in the same Node.js process.
