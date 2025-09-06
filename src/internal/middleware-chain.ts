import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type * as NextMiddleware from "../NextMiddleware.js"

/**
 * @since 0.5.0
 * @category utils
 */
export type MiddlewareChainOptionsBase =
  | {
    readonly callerKind: "page"
    readonly params: Promise<Record<string, string | Array<string> | undefined>>
    readonly searchParams: Promise<Record<string, string | Array<string> | undefined>>
  }
  | {
    readonly callerKind: "layout"
    readonly params: Promise<Record<string, string | Array<string> | undefined>>
    readonly children: unknown
  }
  | {
    readonly callerKind: "action"
  }
  | {
    readonly callerKind: "component"
  }

/**
 * @since 0.5.0
 * @category utils
 */
export const createMiddlewareChain = (
  tags: ReadonlyArray<NextMiddleware.TagClassAny>,
  resolve: (tag: NextMiddleware.TagClassAny) => any,
  base: Effect<any, any, any>,
  options: MiddlewareChainOptionsBase
): Effect<any, any, any> => {
  const buildChain = (index: number): Effect<any, any, any> => {
    if (index >= tags.length) {
      return base
    }
    const tag = tags[index]
    const middleware = resolve(tag)
    const tail = buildChain(index + 1)
    if (tag.wrap) {
      return middleware({ ...options, next: tail })
    }
    return tag.provides !== undefined
      ? Effect_.provideServiceEffect(
        tail,
        tag.provides as any,
        middleware(options) as any
      )
      : Effect_.zipRight(
        middleware(options) as any,
        tail
      )
  }
  return buildChain(0)
}
