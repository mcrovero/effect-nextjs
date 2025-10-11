import { Cause, Chunk, Effect, Exit } from "effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import { unstable_rethrow } from "next/dist/client/components/unstable-rethrow.server.js"

/**
 * @since 0.5.0
 * @category utils
 */
export const executeWithRuntime = async <A>(
  runtime: ManagedRuntime.ManagedRuntime<any, any> | undefined,
  effect: Effect.Effect<A, any, never>
): Promise<A> => {
  const result = runtime
    ? await runtime.runPromiseExit(effect as Effect.Effect<A, any, never>)
    : await Effect.runPromiseExit(effect as Effect.Effect<A, any, never>)
  if (Exit.isFailure(result)) {
    const defects = Chunk.toArray(Cause.defects(result.cause))
    if (defects.length === 1) {
      unstable_rethrow(defects[0])
    }
    const errors = Cause.prettyErrors(result.cause)
    throw errors[0]
  }
  return result.value
}
