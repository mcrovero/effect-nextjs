import { Cause, Chunk, Effect, Exit } from "effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import { unstable_rethrow } from "next/dist/client/components/unstable-rethrow.server.js"
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external.js"
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external.js"
import * as AsyncContext from "./async-context.js"

/**
 * @since 0.5.0
 * @category utils
 */
export const executeWithRuntime = async <A>(
  runtime: ManagedRuntime.ManagedRuntime<any, any> | undefined,
  effect: Effect.Effect<A, any, never>
): Promise<A> => {
  let effect_ = effect as Effect.Effect<A, any, never>

  const asyncStorageDeps: AsyncContext.AsyncStorageDeps = {
    workAsyncStorage,
    workUnitAsyncStorage
  }
  const capturedContext = AsyncContext.captureContext(asyncStorageDeps)
  const wrapWithContext = AsyncContext.createContextWrapper(capturedContext, asyncStorageDeps)

  effect_ = effect_.pipe(Effect.provideService(AsyncContext.ContextWrapperService, wrapWithContext))

  const result = runtime
    ? await runtime.runPromiseExit(effect_)
    : await Effect.runPromiseExit(effect_)

  if (Exit.isFailure(result)) {
    const defects = Chunk.toArray(Cause.defects(result.cause))
    if (defects.length === 1) {
      unstable_rethrow(defects[0])
    }
    const errors = Cause.prettyErrors(result.cause)

    throw errors[0] ?? Cause.squash(result.cause)
  }

  return result.value
}
