# Agent builder

The published `@theorvane/type-chain@0.2.1` `/agent` subpath provides a narrow decorator-first bridge to LangChain's `createAgent()`. The application provides the model and retains ownership of the lifecycle and all runtime controls.

## Prerequisites

- Node.js 20 or later
- TypeScript with standard (Stage 3) decorators; do **not** enable `experimentalDecorators`
- An application-owned LangChain model integration and credentials

## Install

```bash
npm install @theorvane/type-chain@0.2.1 @langchain/core langchain zod
```

`/agent` is optional. Import the root package alone when tool metadata is sufficient.

## Configure TypeScript

Create `tsconfig.json`:

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

Leave `experimentalDecorators` off.

## Declare and build an agent

Create `src/catalog-agent.ts`:

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

// Obtain this value from the application's selected LangChain model integration.
declare const applicationOwnedModel: Parameters<typeof buildAgent>[1]["model"];

export const agent = buildAgent(new CatalogAgent(), {
  model: applicationOwnedModel,
});
```

Use `buildGuardedAgent()` instead when methods declare `@Policy()` and the application must run an enforcement guard before invocation.

## Expected behavior

`agent` is the LangChain agent returned by `createAgent()` with a structured `find_product` tool and the declared system prompt. The example never selects a model, reads credentials, persists messages, or opens a transport.

## What TypeChain does not own

Your application owns model selection and provider credentials; authorization, approval, audit, redaction, retries, and timeouts; conversation state, persistence, streaming, and error handling; graph topology; HTTP hosting, deployment, and observability.

## Next steps

- [Policy and guards](./policy.md) — add an application-owned guard for policy-decorated methods.
- [LangChain integration](./langchain-integration.md) — use the adapter directly when you prefer to create the agent yourself.
- [TypeMCP bridge](./typemcp-bridge.md) — use a TypeMCP declaration only within one Node.js process.
