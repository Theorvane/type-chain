import { type StructuredToolInterface, tool } from "@langchain/core/tools";

import { getToolDefinitions } from "./tool.js";

export function toLangChainTools(instance: object): StructuredToolInterface[] {
  return getToolDefinitions(instance).map((definition) =>
    tool(async (input) => definition.invoke(input), {
      name: definition.name,
      description: definition.description,
      schema: definition.schema,
    }),
  );
}
