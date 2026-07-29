# Petstore TypeChain foundation: define and inspect a typed tool

This chapter continues a strict TypeScript Petstore workspace with one TypeChain tool. It records explicit runtime metadata, inspects immutable definitions, and leaves real domain dependencies and execution ownership in the application.

> **Published version:** The examples target [`@theorvane/type-chain@0.1.1`](https://www.npmjs.com/package/@theorvane/type-chain). They use standard TypeScript decorators rather than legacy `experimentalDecorators`.

## Before you start

- Node.js 20 or later and npm.
- A strict ESM TypeScript workspace. You can use the [TypeMCP Petstore project setup](https://typemcp.theorvane.tech/docs/build/petstore-project-setup) or an equivalent application project.
- A runtime schema library such as Zod. TypeScript parameter types alone are not executable tool schemas.

## Workspace checkpoint

At the end of this chapter, the workspace has a root TypeChain dependency and these application files:

```text
petstore-workspace/
├── package.json
├── tsconfig.json
└── src/
    ├── inspect-tools.ts
    ├── petstore-client.ts
    └── petstore-tools.ts
```

The project can print the `find_product` definition. It does not create a model, endpoint, agent, credential, or authorization decision.

## Install

From the workspace root, install the root package, a runtime schema, and local TypeScript runner if they are not already present:

```bash
npm install @theorvane/type-chain@0.1.1 zod
npm install --save-dev typescript tsx @types/node
npm pkg set type=module
npm pkg set scripts.check="tsc --noEmit"
npm pkg set scripts.inspect-tools="tsx src/inspect-tools.ts"
```

The root package has no required optional peers. Do not install LangChain or TypeMCP until you choose one of those boundaries in the next chapter. `DOM`/`DOM.Iterable` support Web API types used by ecosystem declarations, while `@types/node` supports the local Node process and `console`.

## Configure TypeScript

Create or retain this `tsconfig.json` configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "ESNext.Decorators", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Leave `experimentalDecorators` off. The emitted standard decorator behavior matches the published package contract.

## Define the Petstore tool

Create `src/petstore-client.ts`:

```ts
export interface PetstoreClient {
  findProduct(sku: string): Promise<{
    readonly sku: string;
    readonly name: string;
    readonly available: boolean;
  }>;
}
```

Create `src/petstore-tools.ts`:

```ts
import { z } from "zod";
import { Tool } from "@theorvane/type-chain";

import type { PetstoreClient } from "./petstore-client.js";

export class PetstoreTools {
  constructor(private readonly client: PetstoreClient) {}

  @Tool({
    name: "find_product",
    description: "Find a Petstore product by SKU.",
    schema: z.object({ sku: z.string().min(1) }),
  })
  findProduct({ sku }: { readonly sku: string }) {
    return this.client.findProduct(sku);
  }
}
```

## Inspect the definition

Create `src/inspect-tools.ts`:

```ts
import { getToolDefinitions } from "@theorvane/type-chain";

import type { PetstoreClient } from "./petstore-client.js";
import { PetstoreTools } from "./petstore-tools.js";

const localPetstoreClient: PetstoreClient = {
  findProduct: async (sku) => ({
    sku,
    name: "Petstore starter product",
    available: true,
  }),
};

const definitions = getToolDefinitions(new PetstoreTools(localPetstoreClient));
console.log(definitions.map((definition) => definition.name));
```

`@Tool()` records the explicit public name, description, and runtime schema. `getToolDefinitions()` returns frozen, receiver-bound definitions. It does not invoke a model or expose an endpoint.

## Run and verify

Run the compiler and inspect the result:

```bash
npm run check
npm run inspect-tools
```

## Expected behavior

The typecheck succeeds, then the second command prints:

```text
[ 'find_product' ]
```

The local client is only a deterministic tutorial stand-in. Replace it at the application composition root with an implementation that has the domain dependency and credential policy your project requires.

## Failure guide

- **`Cannot find module '@theorvane/type-chain'`:** install the released root package in the same workspace and run the command from its root.
- **Decorator type errors:** keep `module`/`moduleResolution` as `NodeNext`, include `ESNext.Decorators`, and remove legacy `experimentalDecorators`.
- **A tool name or schema error:** `@Tool()` requires a portable explicit name and a structured runtime object schema. Start with the Zod object shown above and tighten it for your domain.
- **A real catalog request fails:** test the client implementation separately. The definition layer deliberately does not retry, authenticate, or turn a failed external request into a tool result.

## Responsibility boundary

TypeChain records typed tool metadata and binds definitions to an application instance. You own the Petstore client, credentials, runtime validation beyond the schema, authorization, retry/timeout behavior, model selection, state, persistence, transport, hosting, and deployment.

## Next steps

Continue with [Petstore policy and composition](petstore-policy-and-composition.md) to record policy intent for a state-changing tool and select exactly one optional `/langchain`, `/agent`, or `/typemcp` boundary.
