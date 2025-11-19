/**
 * @since 0.30.0
 */
import { Effect } from "effect"
import * as Context_ from "effect/Context"
import { revalidatePath, revalidateTag } from "next/cache.js"
import { ContextWrapperService } from "./internal/async-context.js"

/**
 * Revalidate a specific path.
 *
 * @since 0.30.0
 * @category cache
 */
export const RevalidatePath = (
  ...args: Parameters<typeof revalidatePath>
): Effect.Effect<void, never, never> =>
  Effect.flatMap(
    Effect.context<never>(),
    (context) => {
      const wrapWithContext = Context_.unsafeGet(context, ContextWrapperService)
      const wrappedFn = wrapWithContext(revalidatePath)
      return Effect.sync(() => wrappedFn(...args))
    }
  )

/**
 * Revalidate a cache tag.
 *
 * @since 0.30.0
 * @category cache
 */
export const RevalidateTag = (
  ...args: Parameters<typeof revalidateTag>
): Effect.Effect<void, never, never> =>
  Effect.flatMap(
    Effect.context<never>(),
    (context) => {
      const wrapWithContext = Context_.unsafeGet(context, ContextWrapperService)
      const wrappedFn = wrapWithContext(revalidateTag)
      return Effect.sync(() => wrappedFn(...args))
    }
  )
