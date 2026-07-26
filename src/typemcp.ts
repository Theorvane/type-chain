import {
  type CreateLangChainToolsOptions,
  createLangChainTools,
} from "@theorvane/type-mcp/langchain";
import { type CreateAgentParams, createAgent } from "langchain";

type TypeMcpServerConstructor<T extends object> = new (
  ...args: readonly unknown[]
) => T;

type CreateTypeMcpAgentOptions<T extends object> = Omit<
  CreateAgentParams,
  "tools"
> & {
  readonly server: TypeMcpServerConstructor<T>;
  readonly resolver: CreateLangChainToolsOptions<T>["resolver"];
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

export type { CreateTypeMcpAgentOptions };
