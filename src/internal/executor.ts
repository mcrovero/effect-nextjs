import { Cause, Effect, Exit } from "effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"

/**
 * @since 0.5.0
 * @category utils
 */
export const executeWithRuntime = async <A>(
  runtime: ManagedRuntime.ManagedRuntime<any, any> | undefined,
  effect: Effect.Effect<A, any, never>
): Promise<A> => {
  const result = runtime
    ? await runtime.runPromiseExit(effect)
    : await Effect.runPromiseExit(effect)

  if (Exit.isFailure(result)) {
    const defects = result.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
    // Preserve Error identity, including Next.js routing and rendering signals.
    // No private Next.js error classifier is needed at the Promise boundary.
    if (defects.length === 1 && defects[0] instanceof Error) {
      throw defects[0]
    }
    const errors = Cause.prettyErrors(result.cause)

    throw errors[0] ?? Cause.squash(result.cause)
  }

  return result.value
}
