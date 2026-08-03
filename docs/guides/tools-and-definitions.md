# Tools and definitions

This guide uses the published `@theorvane/type-chain@0.2.0` root surface to record explicit tool metadata and inspect immutable, receiver-bound definitions. TypeChain does not infer runtime schemas from TypeScript types or start a transport.

## Prerequisites

- Node.js 20 or later
- TypeScript with standard (Stage 3) decorators; do **not** enable legacy `experimentalDecorators`
- A runtime object schema such as Zod

## Install

```bash
npm install @theorvane/type-chain@0.2.0 zod
```

The root metadata package has no required optional peer. Add `/langchain`, `/agent`, or `/typemcp` only when your application chooses that integration boundary.

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

Leave `experimentalDecorators` off so TypeScript emits standard Stage 3 decorators.

## Declare a tool

Create `src/inventory-tools.ts`:

```ts
import { z } from "zod";
import { Tool } from "@theorvane/type-chain";

export class InventoryTools {
  @Tool({
    name: "reserve_inventory",
    description: "Reserve available units for an order.",
    schema: z.object({ sku: z.string(), quantity: z.number().int().positive() }),
  })
  reserveInventory(input: { sku: string; quantity: number }) {
    return { reservationId: `res_${input.sku}`, quantity: input.quantity };
  }
}
```

`@Tool()` can decorate public, non-static instance methods. It requires a portable snake-case `name`, non-empty description, and an explicit non-null runtime schema. Private methods, duplicate names in a hierarchy, and legacy decorator metadata are unsupported.

## Inspect immutable definitions

Create `src/inspect-definitions.ts`:

```ts
import { getToolDefinitions } from "@theorvane/type-chain";
import { InventoryTools } from "./inventory-tools.js";

const definitions = getToolDefinitions(new InventoryTools());
const [reservation] = definitions;

console.log(reservation?.name); // reserve_inventory
console.log(await reservation?.invoke({ sku: "coffee", quantity: 2 }));
```

A `ToolDefinition` contains `name`, `description`, `schema`, optional declarative `policy`, and a receiver-bound `invoke(input)`. The returned definitions and their metadata snapshots are immutable; invocation still calls your concrete application instance.

## Expected behavior

Running `src/inspect-definitions.ts` prints `reserve_inventory` and returns the domain result from `InventoryTools`. No model is selected, caller is authorized, schema is inferred from TypeScript, or endpoint is opened.

## Responsibility boundary

TypeChain records metadata and binds definitions to the supplied instance. Your application supplies domain dependencies, input sources, error handling, identity, authorization, persistence, host lifecycle, and deployment.

## Next steps

- [Policy and guards](./policy.md) — record policy intent and enforce it with an application guard.
- [LangChain integration](./langchain-integration.md) — adapt definitions into standard structured tools.
- [Decorator API contract](../api/decorator-api.md) — inspect all public root and subpath exports.
