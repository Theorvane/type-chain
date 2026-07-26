import { type StructuredToolInterface, tool } from "@langchain/core/tools";
import {
  type InteropZodType,
  interopZodTransformInputSchema,
  isInteropZodObject,
  isInteropZodSchema,
} from "@langchain/core/utils/types";

import { getToolDefinitions } from "./tool.js";

type StructuredInputSchema = object;
type JsonSchema = object & { readonly type?: unknown };
type ZodSchema = object & { readonly safeParse?: unknown };

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
  const jsonSchema = schema as JsonSchema;

  if (isValidatedInteropZodSchema(schema)) {
    // Refinements and transforms wrap an object in Zod v3/v4. LangChain exposes
    // the wrapper's input schema, which must still be a structured object.
    return isInteropZodObject(interopZodTransformInputSchema(schema));
  }

  // JSON Schema carries its input type directly. Check it only after a genuine
  // Zod schema so Zod v4's own `type` property cannot be mistaken for JSON.
  return typeof jsonSchema.type === "string" && jsonSchema.type === "object";
}

function isValidatedInteropZodSchema(
  schema: object,
): schema is ZodSchema & InteropZodType {
  const candidate = schema as ZodSchema;

  return (
    isInteropZodSchema(candidate) && typeof candidate.safeParse === "function"
  );
}
