import { type StructuredToolInterface, tool } from "@langchain/core/tools";

import { getToolDefinitions } from "./tool.js";

type StructuredInputSchema = object & {
  readonly _def?: { readonly type?: unknown; readonly typeName?: unknown };
  readonly _zod?: { readonly def?: { readonly type?: unknown } };
  readonly type?: unknown;
};

export function toLangChainTools(instance: object): StructuredToolInterface[] {
  return getToolDefinitions(instance).map((definition) => {
    if (!isStructuredInputSchema(definition.schema)) {
      throw new TypeError(
        `Tool ${definition.name} requires a structured object input schema for LangChain adaptation.`,
      );
    }

    return tool(async (input) => definition.invoke(input), {
      name: definition.name,
      description: definition.description,
      // The runtime guard above narrows the public metadata contract to the
      // structured-schema subset accepted by LangChain's overloaded factory.
      schema: definition.schema as never,
    }) as StructuredToolInterface;
  });
}

function isStructuredInputSchema(
  schema: object,
): schema is StructuredInputSchema {
  const candidate = schema as StructuredInputSchema;

  return (
    candidate.type === "object" ||
    candidate._def?.type === "object" ||
    candidate._def?.typeName === "ZodObject" ||
    candidate._zod?.def?.type === "object"
  );
}
