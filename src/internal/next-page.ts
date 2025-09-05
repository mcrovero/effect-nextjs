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
export interface BuildPageEffectOptions {
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly paramsSchema?: Schema.Schema<any, any, any>
  readonly searchParamsSchema?: Schema.Schema<any, any, any>
  readonly spanName: string
  readonly spanAttributes: Record<string, unknown>
}

/**
 * @since 0.5.0
 * @category internal
 */
export interface PageBuildPropsBase {
  readonly params: Promise<Record<string, string | Array<string> | undefined>>
  readonly searchParams: Promise<Record<string, string | Array<string> | undefined>>
}

/**
 * Extracted implementation for building the page effect.
 *
 * @since 0.5.0
 * @category internal
 */
export const buildPageEffect = <
  P extends PageBuildPropsBase,
  R,
  E
>(
  options: BuildPageEffectOptions,
  handler: (
    payload: { readonly params: Effect<any, any, any>; readonly searchParams: Effect<any, any, any> }
  ) => Effect<R, E, any>
) => {
  const { middlewares, paramsSchema, searchParamsSchema, spanAttributes, spanName } = options
  return (props: P): Effect<R, E, any> => {
    const defaultProps = {
      params: Promise.resolve({}),
      searchParams: Promise.resolve({})
    } as const
    const mergedProps = { ...defaultProps, ...props } as any
    const rawParams = mergedProps.params ?? Promise.resolve({})
    const rawSearchParams = mergedProps.searchParams ?? Promise.resolve({})
    return Effect_.gen(function*() {
      const context = yield* Effect_.context<never>()
      const paramsEffect = paramsSchema
        ? Effect_.promise(() => rawParams).pipe(
          Effect_.flatMap((value) => Schema.decodeUnknown(paramsSchema as any)(value))
        )
        : Effect_.promise(() => rawParams)
      const searchParamsEffect = searchParamsSchema
        ? Effect_.promise(() => rawSearchParams).pipe(
          Effect_.flatMap((value) => Schema.decodeUnknown(searchParamsSchema as any)(value))
        )
        : Effect_.promise(() => rawSearchParams)

      const payload = {
        params: paramsEffect,
        searchParams: searchParamsEffect
      } as const

      let handlerEffect = handler(payload as any) as Effect<any, any, any>
      if (middlewares.length > 0) {
        const options = {
          callerKind: "page" as const,
          params: rawParams,
          searchParams: rawSearchParams
        }
        const tags = middlewares as ReadonlyArray<any>
        handlerEffect = createMiddlewareChain(
          tags,
          (tag) => Context.unsafeGet(context, tag) as any,
          handlerEffect,
          spanName,
          spanAttributes,
          options
        )
      }
      return yield* handlerEffect
    }) as any
  }
}
