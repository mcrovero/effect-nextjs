/**
 * @since 0.30.0
 */
import { Effect } from "effect"
import { cookies, draftMode, headers } from "next/headers.js"

/**
 * Access request cookies.
 *
 * @since 0.30.0
 * @category request
 */
export const Cookies: Effect.Effect<Awaited<ReturnType<typeof cookies>>, never, never> = Effect.promise(() => cookies())

/**
 * Access request headers.
 *
 * @since 0.30.0
 * @category request
 */
export const Headers: Effect.Effect<Awaited<ReturnType<typeof headers>>, never, never> = Effect.promise(() => headers())

/**
 * Access draft mode helpers.
 *
 * @since 0.30.0
 * @category request
 */
export const DraftMode: Effect.Effect<Awaited<ReturnType<typeof draftMode>>, never, never> = Effect.promise(() =>
  draftMode()
)
