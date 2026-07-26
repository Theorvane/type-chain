import { createAgent } from "langchain";

import { toLangChainTools } from "./langchain.js";

type AgentClass = abstract new (...args: never[]) => object;
type AgentModel = Parameters<typeof createAgent>[0]["model"];

export interface AgentOptions {
  readonly systemPrompt?: string;
}

export interface BuildAgentOptions {
  readonly model: AgentModel;
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
  const agentOptions = getAgentOptions(instance);

  return createAgent({
    model: options.model,
    tools: toLangChainTools(instance),
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
