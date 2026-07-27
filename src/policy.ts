// biome-ignore lint/suspicious/noExplicitAny: TypeScript's standard ClassMethodDecoratorContext requires an any-parameter callable constraint.
type DecoratedMethod<This> = (this: This, ...args: any[]) => unknown;

type ToolOwner = object;
type PolicyMethodName = string | symbol;

type RequiredPolicy = "required";

export interface RetryPolicy {
  readonly maxAttempts: number;
}

/**
 * Declarative policy intent for an exposed tool. TypeChain records this data
 * only; the application supplies authorization, approval, retry, timeout,
 * idempotency, audit, and redaction enforcement.
 */
export interface ToolPolicy {
  readonly authorization?: RequiredPolicy;
  readonly approval?: RequiredPolicy;
  readonly audit?: RequiredPolicy;
  readonly idempotency?: RequiredPolicy;
  readonly timeoutMs?: number;
  readonly retry?: RetryPolicy;
}

const policyRegistrations = new WeakMap<
  ToolOwner,
  Map<PolicyMethodName, Readonly<ToolPolicy>>
>();
const policyKeys = new Set<keyof ToolPolicy>([
  "authorization",
  "approval",
  "audit",
  "idempotency",
  "timeoutMs",
  "retry",
]);

/**
 * Records policy intent for a public instance method. This decorator does not
 * execute or enforce policy; application-owned middleware makes policy active.
 */
export function Policy(policy: ToolPolicy) {
  const snapshot = snapshotPolicy(policy);

  return function registerPolicy<
    This extends object,
    Value extends DecoratedMethod<This>,
  >(value: Value, context: ClassMethodDecoratorContext<This, Value>): void {
    validateMethodContext(context, value);

    context.addInitializer(function registerPolicyMetadata(this: unknown) {
      if (typeof this !== "object" || this === null) {
        throw new TypeError("Policy metadata requires a class instance.");
      }

      const owner = findDeclarationOwner(this, context.name, value);
      const registrations = policyRegistrations.get(owner) ?? new Map();
      const existing = registrations.get(context.name);

      if (existing !== undefined) {
        throw new Error(
          `Policy metadata already registered for method: ${String(context.name)}`,
        );
      }

      registrations.set(context.name, snapshot);
      policyRegistrations.set(owner, registrations);
    });
  };
}

export function getDeclaredToolPolicy(
  owner: ToolOwner,
  methodName: PolicyMethodName,
): Readonly<ToolPolicy> | undefined {
  return policyRegistrations.get(owner)?.get(methodName);
}

function snapshotPolicy(policy: ToolPolicy): Readonly<ToolPolicy> {
  validatePolicy(policy);

  const retry =
    policy.retry === undefined
      ? undefined
      : Object.freeze({ maxAttempts: policy.retry.maxAttempts });

  return Object.freeze({
    ...(policy.authorization === undefined
      ? {}
      : { authorization: policy.authorization }),
    ...(policy.approval === undefined ? {} : { approval: policy.approval }),
    ...(policy.audit === undefined ? {} : { audit: policy.audit }),
    ...(policy.idempotency === undefined
      ? {}
      : { idempotency: policy.idempotency }),
    ...(policy.timeoutMs === undefined ? {} : { timeoutMs: policy.timeoutMs }),
    ...(retry === undefined ? {} : { retry }),
  });
}

function validatePolicy(policy: ToolPolicy): void {
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
    if (policy.retry === null || typeof policy.retry !== "object") {
      throw new TypeError("Tool policy retry requires an object.");
    }

    const retryKeys = Object.keys(policy.retry);

    if (
      retryKeys.length !== 1 ||
      retryKeys[0] !== "maxAttempts" ||
      !Number.isSafeInteger(policy.retry.maxAttempts) ||
      policy.retry.maxAttempts <= 0
    ) {
      throw new TypeError(
        "Tool policy retry.maxAttempts must be a positive safe integer.",
      );
    }
  }
}

function validateMethodContext<
  This extends object,
  Value extends DecoratedMethod<This>,
>(context: ClassMethodDecoratorContext<This, Value>, value: Value): void {
  if (
    context.kind !== "method" ||
    context.static ||
    context.private ||
    typeof value !== "function"
  ) {
    throw new TypeError("@Policy can only decorate a public instance method.");
  }
}

function findDeclarationOwner(
  instance: object,
  methodName: PolicyMethodName,
  method: object,
): ToolOwner {
  for (
    let prototype = Object.getPrototypeOf(instance);
    prototype !== null;
    prototype = Object.getPrototypeOf(prototype)
  ) {
    if (
      Object.getOwnPropertyDescriptor(prototype, methodName)?.value === method
    ) {
      return getConstructor(prototype);
    }
  }

  throw new TypeError("Policy metadata could not locate its declaring class.");
}

function getConstructor(prototype: object): ToolOwner {
  const owner = prototype.constructor;

  if (typeof owner !== "function") {
    throw new TypeError(
      "Policy metadata requires an object with a constructor.",
    );
  }

  return owner;
}
