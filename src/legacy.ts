import type { ToolPolicy } from "./policy.js";
import type { ToolDefinition, ToolOptions } from "./tool.js";

export interface AgentOptions {
  readonly systemPrompt?: string;
}

export interface BuildAgentOptions {
  readonly model: unknown;
}

export type LegacyClassDecorator = <T extends object>(target: T) => void;

export type LegacyMethodDecorator = (
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) => void;

interface ToolRegistration {
  readonly methodName: string;
  readonly options: Readonly<ToolOptions>;
  readonly invoke: (instance: object, input: unknown) => unknown;
}

const toolsByClass = new WeakMap<object, ToolRegistration[]>();
const policiesByClass = new WeakMap<
  object,
  Map<string, Readonly<ToolPolicy>>
>();
const agentsByClass = new WeakMap<object, Readonly<AgentOptions>>();
const portableToolName = /^[a-z][a-z0-9_]*$/;
const policyKeys = new Set<keyof ToolPolicy>([
  "authorization",
  "approval",
  "audit",
  "idempotency",
  "timeoutMs",
  "retry",
]);

export function Tool(options: ToolOptions): LegacyMethodDecorator {
  const snapshot = snapshotToolOptions(options);
  return (target, propertyKey, descriptor): void => {
    const methodName = requireMethodName(propertyKey, descriptor, "@Tool");
    const owner = getOwner(target);
    const registrations = toolsByClass.get(owner) ?? [];
    if (
      registrations.some(
        (registration) => registration.methodName === methodName,
      )
    ) {
      throw new Error(
        `Tool metadata already registered for method: ${methodName}`,
      );
    }
    registrations.push({
      methodName,
      options: snapshot,
      invoke: (instance, input) =>
        Reflect.apply(descriptor.value, instance, [input]),
    });
    toolsByClass.set(owner, registrations);
  };
}

export function Policy(policy: ToolPolicy): LegacyMethodDecorator {
  const snapshot = snapshotPolicy(policy);
  return (target, propertyKey, descriptor): void => {
    const methodName = requireMethodName(propertyKey, descriptor, "@Policy");
    const owner = getOwner(target);
    const registrations = policiesByClass.get(owner) ?? new Map();
    if (registrations.has(methodName)) {
      throw new Error(
        `Policy metadata already registered for method: ${methodName}`,
      );
    }
    registrations.set(methodName, snapshot);
    policiesByClass.set(owner, registrations);
  };
}

export function Agent(options: AgentOptions = {}): LegacyClassDecorator {
  validateAgentOptions(options);
  const snapshot = Object.freeze({ ...options });
  return (target): void => {
    agentsByClass.set(target, snapshot);
  };
}

export function getToolDefinitions(
  instance: object,
): readonly ToolDefinition[] {
  const names = new Set<string>();
  const definitions = findOwners(instance).flatMap((owner) =>
    (toolsByClass.get(owner) ?? []).map((registration) => {
      const { name } = registration.options;
      if (names.has(name)) {
        throw new Error(`Duplicate tool name registered: ${name}`);
      }
      names.add(name);
      return Object.freeze({
        name,
        description: registration.options.description,
        schema: registration.options.schema,
        policy: policiesByClass.get(owner)?.get(registration.methodName),
        invoke: (input: unknown): unknown =>
          registration.invoke(instance, input),
      });
    }),
  );
  return Object.freeze(definitions);
}

export async function toLangChainTools(
  instance: object,
): Promise<readonly unknown[]> {
  const { DynamicStructuredTool } = await import("@langchain/core/tools");
  return getToolDefinitions(instance).map(
    (definition) =>
      new DynamicStructuredTool({
        name: definition.name,
        description: definition.description,
        schema: definition.schema,
        func: async (input) => definition.invoke(input),
      }),
  );
}

export async function buildAgent(
  instance: object,
  options: BuildAgentOptions,
): Promise<unknown> {
  const agent = getAgentOptions(instance);
  const { createAgent } = await import("langchain");
  return Reflect.apply(createAgent, undefined, [
    {
      model: options.model,
      tools: await toLangChainTools(instance),
      ...(agent.systemPrompt === undefined
        ? {}
        : { systemPrompt: agent.systemPrompt }),
    },
  ]);
}

function snapshotToolOptions(options: ToolOptions): Readonly<ToolOptions> {
  if (!portableToolName.test(options.name)) {
    throw new TypeError(
      "Tool names must use portable snake_case beginning with a lowercase letter.",
    );
  }
  if (options.description.trim().length === 0) {
    throw new TypeError("Tool descriptions must be non-empty.");
  }
  if (options.schema === null || typeof options.schema !== "object") {
    throw new TypeError(
      "Tool options require an explicit non-null runtime schema object.",
    );
  }
  return Object.freeze({ ...options });
}

function snapshotPolicy(policy: ToolPolicy): Readonly<ToolPolicy> {
  if (policy === null || typeof policy !== "object") {
    throw new TypeError("Tool policy requires an object.");
  }

  const keys = Object.keys(policy) as (keyof ToolPolicy)[];
  if (keys.length === 0) {
    throw new TypeError("Tool policy requires at least one explicit intent.");
  }
  for (const key of keys) {
    if (!policyKeys.has(key)) {
      throw new TypeError(`Tool policy contains an unsupported field: ${key}`);
    }
  }
  for (const key of [
    "authorization",
    "approval",
    "audit",
    "idempotency",
  ] as const) {
    if (policy[key] !== undefined && policy[key] !== "required") {
      throw new TypeError(`Tool policy ${key} must be "required" when set.`);
    }
  }
  if (
    policy.timeoutMs !== undefined &&
    (!Number.isSafeInteger(policy.timeoutMs) || policy.timeoutMs <= 0)
  ) {
    throw new TypeError(
      "Tool policy timeoutMs must be a positive safe integer.",
    );
  }
  if (policy.retry !== undefined) {
    if (
      policy.retry === null ||
      typeof policy.retry !== "object" ||
      Object.keys(policy.retry).length !== 1 ||
      Object.keys(policy.retry)[0] !== "maxAttempts" ||
      !Number.isSafeInteger(policy.retry.maxAttempts) ||
      policy.retry.maxAttempts <= 0
    ) {
      throw new TypeError(
        "Tool policy retry.maxAttempts must be a positive safe integer.",
      );
    }
  }

  return Object.freeze({
    ...policy,
    ...(policy.retry === undefined
      ? {}
      : { retry: Object.freeze({ maxAttempts: policy.retry.maxAttempts }) }),
  });
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

function getAgentOptions(instance: object): Readonly<AgentOptions> {
  for (const owner of findOwners(instance)) {
    const options = agentsByClass.get(owner);
    if (options !== undefined) {
      return options;
    }
  }
  throw new TypeError(
    "buildAgent requires an instance of a class decorated with @Agent.",
  );
}

function requireMethodName(
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
  decorator: string,
): string {
  if (
    typeof propertyKey !== "string" ||
    typeof descriptor.value !== "function"
  ) {
    throw new TypeError(
      `${decorator} can only decorate a public instance method.`,
    );
  }
  return propertyKey;
}

function getOwner(target: object): object {
  const owner = target.constructor;
  if (typeof owner !== "function") {
    throw new TypeError(
      "Decorator metadata requires an object with a constructor.",
    );
  }
  return owner;
}

function findOwners(instance: object): readonly object[] {
  const owners: object[] = [];
  for (
    let prototype = Object.getPrototypeOf(instance);
    prototype !== null;
    prototype = Object.getPrototypeOf(prototype)
  ) {
    const owner = getOwner(prototype);
    if (owner !== Object && !owners.includes(owner)) {
      owners.unshift(owner);
    }
  }
  return owners;
}
