import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type * as NextMiddleware from "../NextMiddleware.js"
import { createMiddlewareChain } from "./middleware-chain.js"

/**
 * @since 0.5.0
 * @category internal
 */
export interface BuildServerComponentEffectOptions {
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly spanName: string
  readonly spanAttributes: Record<string, unknown>
}

/**
 * Extracted implementation for building the server component effect.
 *
 * @since 0.5.0
 * @category internal
 */
export const buildServerComponentEffect = <
  P,
  R,
  E
>(
  options: BuildServerComponentEffectOptions,
  handler: (props: P | undefined) => Effect<R, E, any>
) => {
  const { middlewares, spanAttributes, spanName } = options
  return (props?: P): Effect<R, E, any> => {
    return Effect_.gen(function*() {
      const context = yield* Effect_.context<never>()
      let handlerEffect = handler(props)
      if (middlewares.length > 0) {
        const options = { callerKind: "component" as const }
        const tags = middlewares
        handlerEffect = createMiddlewareChain(
          tags,
          (tag) => Context.unsafeGet(context, tag),
          handlerEffect,
          spanName,
          spanAttributes,
          options
        )
      }
      return yield* handlerEffect
    })
  }
}
