import { Cause, Chunk, Effect, Exit } from "effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import { revalidatePath, revalidateTag } from "next/cache.js"
import { unstable_rethrow } from "next/dist/client/components/unstable-rethrow.server.js"
import { RevalidatePathFn, RevalidateTagFn } from "../Cache.js"

/**
 * @since 0.5.0
 * @category utils
 */
export const executeWithRuntime = async <A>(
  runtime: ManagedRuntime.ManagedRuntime<any, any> | undefined,
  effect: Effect.Effect<A, any, never>
): Promise<A> => {
  let effect_ = effect as Effect.Effect<A, any, never>

  /**
   * Workaround to revalidate paths and tags in the same effect.
   */
  const willRevalidatePaths = new Set<Parameters<typeof revalidatePath>>()
  const willRevalidateTags = new Set<Parameters<typeof revalidateTag>>()
  const revalidatePathFn = (...args: Parameters<typeof revalidatePath>) => {
    willRevalidatePaths.add(args)
  }
  const revalidateTagFn = (...args: Parameters<typeof revalidateTag>) => {
    willRevalidateTags.add(args)
  }
  effect_ = effect_.pipe(Effect.provideService(RevalidatePathFn, revalidatePathFn))
  effect_ = effect_.pipe(Effect.provideService(RevalidateTagFn, revalidateTagFn))

  const result = runtime
    ? await runtime.runPromiseExit(effect_)
    : await Effect.runPromiseExit(effect_)
  if (Exit.isFailure(result)) {
    const defects = Chunk.toArray(Cause.defects(result.cause))
    if (defects.length === 1) {
      unstable_rethrow(defects[0])
    }
    const errors = Cause.prettyErrors(result.cause)

    throw errors[0]
  }

  // Revalidate paths and tags
  for (const args of willRevalidatePaths) {
    revalidatePath(...args)
  }
  for (const args of willRevalidateTags) {
    revalidateTag(...args)
  }
  return result.value
}
