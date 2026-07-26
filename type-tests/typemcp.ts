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
void createTypeMcpAgent({
  model: new FakeToolCallingModel(),
  server: TypeTestApiServer,
  resolver,
});
