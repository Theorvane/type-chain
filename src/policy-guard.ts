import type { ToolPolicy } from "./policy.js";
import { getToolDefinitions, type ToolDefinition } from "./tool.js";

/**
 * The application-owned context supplied before a policy-decorated tool runs.
 * TypeChain does not interpret or enforce the policy itself.
 */
export interface ToolPolicyGuardContext {
  readonly definition: ToolDefinition;
  readonly policy: Readonly<ToolPolicy>;
  readonly input: unknown;
}

/**
 * Application-owned policy enforcement hook. Throw or reject to prevent the
 * tool from running; resolve to allow the receiver-bound tool invocation.
 */
export type ToolPolicyGuard = (
  context: Readonly<ToolPolicyGuardContext>,
) => void | Promise<void>;

/**
 * Returns immutable, receiver-bound tool definitions whose policy-decorated
 * invocations first call the supplied application-owned guard. Tools without
 * declared policy preserve direct invocation behavior.
 */
export function withToolPolicyGuard(
  instance: object,
  guard: ToolPolicyGuard,
): readonly ToolDefinition[] {
  if (typeof guard !== "function") {
    throw new TypeError("Tool policy guard must be a function.");
  }

  return Object.freeze(
    getToolDefinitions(instance).map((definition) =>
      Object.freeze({
        ...definition,
        invoke: (input: unknown): unknown => {
          if (definition.policy === undefined) {
            return definition.invoke(input);
          }

          return invokeWithPolicyGuard(definition, input, guard);
        },
      }),
    ),
  );
}

async function invokeWithPolicyGuard(
  definition: ToolDefinition,
  input: unknown,
  guard: ToolPolicyGuard,
): Promise<unknown> {
  const policy = definition.policy;

  if (policy === undefined) {
    return definition.invoke(input);
  }

  await guard(
    Object.freeze({
      definition,
      policy,
      input,
    }),
  );

  return definition.invoke(input);
}
