import { McpServer, McpTool } from "@theorvane/type-mcp";
import { FakeToolCallingModel } from "langchain";
import { z } from "zod";

import {
  createTypeMcpAgent,
  createTypeMcpLangChainTools,
} from "../src/typemcp.js";

@McpServer({ name: "type_test_api", version: "1.0.0" })
class TypeTestApiServer {
  @McpTool({
    name: "lookup_value",
    description: "Look up a value.",
    input: z.object({ value: z.string() }),
  })
  lookupValue(input: { readonly value: string }): string {
    return input.value;
  }
}
const resolver = { resolve: () => new TypeTestApiServer() };

void createTypeMcpLangChainTools(TypeTestApiServer, { resolver });

interface TypedCatalogClient {
  findProduct(sku: string): Promise<unknown>;
}

declare const typedCatalogClient: TypedCatalogClient;

@McpServer({ name: "typed_catalog", version: "1.0.0" })
class TypedCatalogServer {
  private readonly client: TypedCatalogClient;

  constructor(client: unknown) {
    if (!isTypedCatalogClient(client)) {
      throw new TypeError("TypedCatalogServer requires a catalog client.");
    }

    this.client = client;
  }

  @McpTool({
    name: "find_product",
    description: "Find a typed catalog product.",
    input: z.object({ sku: z.string().min(1) }),
  })
  findProduct({ sku }: { readonly sku: string }) {
    return this.client.findProduct(sku);
  }
}

function isTypedCatalogClient(value: unknown): value is TypedCatalogClient {
  return (
    typeof value === "object" &&
    value !== null &&
    "findProduct" in value &&
    typeof value.findProduct === "function"
  );
}

void createTypeMcpAgent({
  model: new FakeToolCallingModel(),
  server: TypedCatalogServer,
  resolver: { resolve: () => new TypedCatalogServer(typedCatalogClient) },
});
