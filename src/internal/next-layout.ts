import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import * as Schema from "effect/Schema"
import type { NextLayoutBaseProps } from "src/NextLayout.js"
import type * as NextMiddleware from "../NextMiddleware.js"
import { createMiddlewareChain } from "./middleware-chain.js"

/**
 * @since 0.5.0
 * @category internal
 */
export interface BuildLayoutEffectOptions {
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly paramsSchema?: Schema.Schema<any, any, any>
  readonly spanName: string
  readonly spanAttributes: Record<string, unknown>
}

/**
 * Extracted implementation for building the layout effect.
 *
 * @since 0.5.0
 * @category internal
 */
export const buildLayoutEffect = <
  P extends NextLayoutBaseProps,
  R,
  E
>(
  options: BuildLayoutEffectOptions,
  handler: (payload: { readonly params: Effect<any, any, any>; readonly children?: unknown }) => Effect<R, E, any>
) => {
  const { middlewares, paramsSchema, spanAttributes, spanName } = options
  return (props: P): Effect<R, E, any> => {
    const defaultProps = {
      params: Promise.resolve({}),
      children: undefined
    } as const
    const mergedProps = { ...defaultProps, ...props } as any
    const rawParams = mergedProps.params ?? Promise.resolve({})
    return Effect_.gen(function*() {
      const context = yield* Effect_.context<never>()
      const paramsEffect = paramsSchema
        ? Effect_.promise(() => rawParams).pipe(
          Effect_.flatMap((value: any) => Schema.decodeUnknown(paramsSchema as any)(value))
        )
        : Effect_.promise(() => rawParams)
      const payload = { params: paramsEffect, children: mergedProps.children } as const

      let handlerEffect = handler(payload)
      if (middlewares.length > 0) {
        const options = { callerKind: "layout" as const, params: rawParams, children: mergedProps.children }
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
