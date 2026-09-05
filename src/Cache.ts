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
 * Revalidate a cache tag. Defaults to immediate expiration, preserving Next 15
 * behavior. On Next 16, pass "max" for stale-while-revalidate semantics.
 * Next 15 ignores the profile argument.
 *
 * @since 0.30.0
 * @category cache
 */
export const RevalidateTag = (
  tag: string,
  profile: string | { expire?: number } = { expire: 0 }
): Effect.Effect<void, never, never> =>
  Effect.sync(() => (revalidateTag as (tag: string, profile: string | { expire?: number }) => void)(tag, profile))
