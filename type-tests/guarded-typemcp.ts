import { McpServer, McpTool } from "@theorvane/type-mcp";
import { FakeToolCallingModel } from "langchain";
import { z } from "zod";

import {
  createGuardedTypeMcpAgent,
  createGuardedTypeMcpLangChainTools,
  type TypeMcpToolGuard,
} from "../src/typemcp.js";

@McpServer({ name: "guarded_type_test_api", version: "1.0.0" })
class GuardedTypeTestApiServer {
  @McpTool({
    name: "guarded_lookup_value",
    description: "Look up a value through a guarded bridge.",
    input: z.object({ value: z.string() }),
  })
  lookupValue(input: { readonly value: string }): string {
    return input.value;
  }
}

const resolver = { resolve: () => new GuardedTypeTestApiServer() };
const guard: TypeMcpToolGuard = async ({ name, description, input }) => {
  void name;
  void description;
  void input;
};

void createGuardedTypeMcpLangChainTools(
  GuardedTypeTestApiServer,
  { resolver },
  guard,
);

void createGuardedTypeMcpAgent({
  model: new FakeToolCallingModel(),
  server: GuardedTypeTestApiServer,
  resolver,
  guard,
});
