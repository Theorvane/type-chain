# Tools and definitions

This guide documents the published `@theorvane/type-chain@0.1.1` tool metadata surface. TypeChain records explicit declarations; it does not infer schemas from TypeScript types or execute a transport.

## The @Tool() contract

`@Tool()` decorates a public instance method and requires three explicit fields:

```ts
import { z } from "zod";
import { Tool } from "@theorvane/type-chain";

class InventoryTools {
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

The decorator supports standard Stage 3 decorators only. It can decorate public, non-static instance methods; private methods and legacy decorator metadata are not supported.

## Naming and validation

TypeChain validates tool declarations when the decorator is created and metadata is registered:

- `name` must be portable snake case: lowercase, starts with a letter, and contains only lowercase letters, digits, and underscores.
- `description` must be non-empty.
- `schema` must be an explicit non-null runtime schema object.
- A class hierarchy cannot expose duplicate tool names.

TypeScript parameter types are not runtime schemas. Supply a Zod or JSON Schema object that the integration you choose can validate.

## Read immutable definitions

```ts
import { getToolDefinitions } from "@theorvane/type-chain";

const inventory = new InventoryTools();
const definitions = getToolDefinitions(inventory);

for (const definition of definitions) {
  console.log(definition.name, definition.description);
  const result = definition.invoke({ sku: "coffee", quantity: 2 });
  console.log(result);
}
```

A `ToolDefinition` contains `name`, `description`, `schema`, optional declarative `policy`, and a receiver-bound `invoke(input)` function. The definitions and their metadata snapshots are immutable, but invoking a definition calls the real instance method and therefore follows the dependencies and side effects that your application supplied.

## Inheritance

Definitions from base classes are collected before subclass definitions. The instance remains the invocation receiver.

```ts
class BaseTools {
  @Tool({ name: "health_check", description: "Return service health.", schema: {} })
  healthCheck() {
    return { ok: true };
  }
}

class OrderTools extends BaseTools {
  @Tool({ name: "find_order", description: "Find an order.", schema: {} })
  findOrder() {
    return { id: "order_1" };
  }
}
```

Use unique, stable names across the hierarchy. TypeChain raises an error when an instance would expose the same tool name twice.

## From definition to integration

Definitions are intentionally framework-neutral. Import the dedicated [`@theorvane/type-chain/langchain`](./langchain-integration.md) subpath when you want standard LangChain structured tools. Import the root package only when metadata definitions are sufficient.
