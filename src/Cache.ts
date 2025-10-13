/**
 * @since 0.30.0
 */
import { Effect } from "effect"
import { revalidatePath, revalidateTag } from "next/cache.js"
/**
 * Revalidate a specific path.
 *
 * @since 0.30.0
 * @category cache
 */
export const RevalidatePath = (
  ...args: Parameters<typeof revalidatePath>
): Effect.Effect<void, never, never> => Effect.sync(() => revalidatePath(...args))

/**
 * Revalidate a cache tag.
 *
 * @since 0.30.0
 * @category cache
 */
export const RevalidateTag = (
  ...args: Parameters<typeof revalidateTag>
): Effect.Effect<void, never, never> => Effect.sync(() => revalidateTag(...args))
