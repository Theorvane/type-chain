import { createAgent } from "langchain";

import { toGuardedLangChainTools, toLangChainTools } from "./langchain.js";
import type { ToolPolicyGuard } from "./policy-guard.js";

type AgentClass = abstract new (...args: never[]) => object;
type AgentModel = Parameters<typeof createAgent>[0]["model"];

export interface AgentOptions {
  readonly systemPrompt?: string;
}

export interface BuildAgentOptions {
  readonly model: AgentModel;
}

export interface BuildGuardedAgentOptions extends BuildAgentOptions {
  readonly guard: ToolPolicyGuard;
}

const agentRegistrations = new WeakMap<object, Readonly<AgentOptions>>();

export function Agent(options: AgentOptions = {}) {
  validateAgentOptions(options);

  return function registerAgent<T extends AgentClass>(
    value: T,
    context: ClassDecoratorContext<T>,
  ): void {
    if (context.kind !== "class") {
      throw new TypeError("@Agent can only decorate a class.");
    }

    context.addInitializer(function registerAgentMetadata() {
      agentRegistrations.set(value, Object.freeze({ ...options }));
    });
  };
}

export function buildAgent(instance: object, options: BuildAgentOptions) {
  return createDecoratedAgent(
    instance,
    options.model,
    toLangChainTools(instance),
  );
}

/**
 * Builds a LangChain agent whose @Policy()-decorated tools invoke an
 * application-supplied guard. TypeChain supplies no default policy decision.
 */
export function buildGuardedAgent(
  instance: object,
  options: BuildGuardedAgentOptions,
) {
  return createDecoratedAgent(
    instance,
    options.model,
    toGuardedLangChainTools(instance, options.guard),
  );
}

function createDecoratedAgent(
  instance: object,
  model: AgentModel,
  tools: ReturnType<typeof toLangChainTools>,
) {
  const agentOptions = getAgentOptions(instance);

  return createAgent({
    model,
    tools,
    ...(agentOptions.systemPrompt === undefined
      ? {}
      : { systemPrompt: agentOptions.systemPrompt }),
  });
}

function getAgentOptions(instance: object): Readonly<AgentOptions> {
  for (
    let prototype = Object.getPrototypeOf(instance);
    prototype !== null;
    prototype = Object.getPrototypeOf(prototype)
  ) {
    const owner = prototype.constructor;

    if (typeof owner === "function") {
      const options = agentRegistrations.get(owner);

      if (options !== undefined) {
        return options;
      }
    }
  }

  throw new TypeError(
    "buildAgent requires an instance of a class decorated with @Agent.",
  );
}

function validateAgentOptions(options: AgentOptions): void {
  if (
    options.systemPrompt !== undefined &&
    options.systemPrompt.trim().length === 0
  ) {
    throw new TypeError(
      "Agent system prompts must be non-empty when provided.",
    );
  }
}
