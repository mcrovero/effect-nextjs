import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import * as Schema from "effect/Schema"
import type * as NextMiddleware from "../NextMiddleware.js"
import { createMiddlewareChain } from "./middleware-chain.js"

/**
 * @since 0.5.0
 * @category internal
 */
export interface BuildActionEffectOptions {
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly inputSchema?: Schema.Schema.All
  readonly spanName: string
  readonly spanAttributes: Record<string, unknown>
}

/**
 * Extracted implementation for building the action effect.
 *
 * @since 0.5.0
 * @category internal
 */
export const buildActionEffect = <
  R,
  E
>(
  options: BuildActionEffectOptions,
  handler: (payload: { readonly input: any }) => Promise<Effect<R, E, any>>
) => {
  const { inputSchema, middlewares, spanAttributes, spanName } = options
  return (inputArg: unknown): Effect<R, E, any> => {
    return Effect_.gen(function*() {
      const context = yield* Effect_.context<never>()
      const rawInput = inputArg !== undefined ? inputArg : undefined
      const input = inputSchema
        ? Schema.decodeUnknown(inputSchema as any)(rawInput)
        : rawInput
      const payload = { input }
      let handlerEffect = yield* Effect_.promise(() => handler(payload))
      if (middlewares.length > 0) {
        const options = { callerKind: "action" as const, input: payload.input }
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
