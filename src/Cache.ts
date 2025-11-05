/**
 * @since 0.30.0
 */
import { Effect } from "effect"
import * as Context_ from "effect/Context"
import type { revalidatePath, revalidateTag } from "next/cache.js"

// Declaring a tag for the RevalidatePathFn service
export class RevalidatePathFn extends Context_.Tag("RevalidatePathFn")<
  RevalidatePathFn,
  (...args: Parameters<typeof revalidatePath>) => void
>() {}

// Declaring a tag for the RevalidatePathFn service
export class RevalidateTagFn extends Context_.Tag("RevalidateTagFn")<
  RevalidateTagFn,
  (...args: Parameters<typeof revalidateTag>) => void
>() {}

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
    (context) => Effect.sync(() => Context_.unsafeGet(context, RevalidatePathFn)(...args))
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
    (context) => Effect.sync(() => Context_.unsafeGet(context, RevalidateTagFn)(...args))
  )
