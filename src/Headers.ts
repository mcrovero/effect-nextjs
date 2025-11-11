/**
 * @since 0.30.0
 */
import { Effect } from "effect"
import * as Context_ from "effect/Context"
import { cookies, draftMode, headers } from "next/headers.js"
import { ContextWrapperService } from "./internal/async-context.js"

/**
 * Access request cookies.
 *
 * @since 0.30.0
 * @category request
 */
export const Cookies: Effect.Effect<Awaited<ReturnType<typeof cookies>>, never, never> = Effect.flatMap(
  Effect.context<never>(),
  (context) => {
    const wrapWithContext = Context_.unsafeGet(context, ContextWrapperService)
    const wrappedFn = wrapWithContext(cookies)
    return Effect.promise(() => wrappedFn())
  }
)

/**
 * Access request headers.
 *
 * @since 0.30.0
 * @category request
 */
export const Headers: Effect.Effect<Awaited<ReturnType<typeof headers>>, never, never> = Effect.flatMap(
  Effect.context<never>(),
  (context) => {
    const wrapWithContext = Context_.unsafeGet(context, ContextWrapperService)
    const wrappedFn = wrapWithContext(headers)
    return Effect.promise(() => wrappedFn())
  }
)

/**
 * Access draft mode helpers.
 *
 * @since 0.30.0
 * @category request
 */
export const DraftMode: Effect.Effect<Awaited<ReturnType<typeof draftMode>>, never, never> = Effect.flatMap(
  Effect.context<never>(),
  (context) => {
    const wrapWithContext = Context_.unsafeGet(context, ContextWrapperService)
    const wrappedFn = wrapWithContext(draftMode)
    return Effect.promise(() => wrappedFn())
  }
)
