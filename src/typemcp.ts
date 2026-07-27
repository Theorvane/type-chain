import { type DynamicStructuredTool, tool } from "@langchain/core/tools";
import {
  type CreateLangChainToolsOptions,
  createLangChainTools,
} from "@theorvane/type-mcp/langchain";
import { type CreateAgentParams, createAgent } from "langchain";

type TypeMcpServerConstructor<T extends object> = new (
  ...args: readonly unknown[]
) => T;

export type CreateTypeMcpAgentOptions<T extends object> = Omit<
  CreateAgentParams,
  "tools"
> & {
  readonly server: TypeMcpServerConstructor<T>;
  readonly resolver: CreateLangChainToolsOptions<T>["resolver"];
};

/** Minimal application-owned context for a TypeMCP-derived tool invocation. */
export interface TypeMcpToolGuardContext {
  readonly name: string;
  readonly description: string;
  readonly input: unknown;
}

/** Throw or reject to prevent an in-process TypeMCP tool invocation. */
export type TypeMcpToolGuard = (
  context: Readonly<TypeMcpToolGuardContext>,
) => void | Promise<void>;

export type CreateGuardedTypeMcpAgentOptions<T extends object> =
  CreateTypeMcpAgentOptions<T> & {
    readonly guard: TypeMcpToolGuard;
  };

/**
 * Converts a decorated TypeMCP server into native LangChain tools in the
 * current process. TypeMCP owns declaration validation and instance resolution.
 */
export async function createTypeMcpLangChainTools<T extends object>(
  serverClass: TypeMcpServerConstructor<T>,
  options: CreateLangChainToolsOptions<T>,
) {
  return createLangChainTools(serverClass, options);
}

/**
 * Converts a TypeMCP-decorated server into LangChain tools that invoke an
 * application-supplied guard after TypeMCP/LangChain validation and before the
 * resolver-backed method runs. TypeChain supplies no default policy decision.
 */
export async function createGuardedTypeMcpLangChainTools<T extends object>(
  serverClass: TypeMcpServerConstructor<T>,
  options: CreateLangChainToolsOptions<T>,
  guard: TypeMcpToolGuard,
) {
  if (typeof guard !== "function") {
    throw new TypeError("TypeMCP tool guard must be a function.");
  }

  const tools = await createTypeMcpLangChainTools(serverClass, options);

  return tools.map((source) => guardTypeMcpTool(source, guard));
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const property of Object.values(value)) deepFreeze(property);
    Object.freeze(value);
  }

  return value;
}

function guardTypeMcpTool(
  source: DynamicStructuredTool,
  guard: TypeMcpToolGuard,
): DynamicStructuredTool {
  return tool(
    async (input) => {
      await guard(
        Object.freeze({
          name: source.name,
          description: source.description,
          input: deepFreeze(structuredClone(input)),
        }),
      );

      return source.invoke(input);
    },
    {
      name: source.name,
      description: source.description,
      schema: source.schema as never,
    },
  ) as unknown as DynamicStructuredTool;
}

/**
 * Builds a LangChain agent from guarded in-process TypeMCP tools without
 * starting an MCP transport. The caller owns the model and policy decisions.
 */
export async function createGuardedTypeMcpAgent<T extends object>({
  server,
  resolver,
  guard,
  ...agentOptions
}: CreateGuardedTypeMcpAgentOptions<T>) {
  const tools = await createGuardedTypeMcpLangChainTools(
    server,
    { resolver },
    guard,
  );

  return createAgent({ ...agentOptions, tools: [...tools] });
}

/**
 * Builds a LangChain agent from TypeMCP tools without starting an MCP transport.
 * The caller owns the model, API client, and all runtime policy.
 */
export async function createTypeMcpAgent<T extends object>({
  server,
  resolver,
  ...agentOptions
}: CreateTypeMcpAgentOptions<T>) {
  const tools = await createTypeMcpLangChainTools(server, { resolver });

  return createAgent({ ...agentOptions, tools: [...tools] });
}
