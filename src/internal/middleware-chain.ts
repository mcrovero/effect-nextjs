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
    readonly params: Promise<Record<string, string | undefined>>
    readonly searchParams: Promise<Record<string, string | undefined>>
  }
  | {
    readonly callerKind: "layout"
    readonly params: Promise<Record<string, string | undefined>>
    readonly children: unknown
  }
  | {
    readonly callerKind: "action"
    readonly input?: unknown
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
  spanName: string,
  spanAttributes: Record<string, unknown>,
  options: MiddlewareChainOptionsBase
): Effect<any, any, any> => {
  const buildChain = (index: number): Effect<any, any, any> => {
    if (index >= tags.length) {
      return base
    }
    const tag = tags[index]
    const middleware = resolve(tag)
    const tail = buildChain(index + 1)
    const middlewareSpanName = `${spanName}/middleware/${tag.key ?? "unknown"}`
    const middlewareSpanOptions = {
      attributes: {
        ...spanAttributes,
        middleware: tag.key ?? "unknown"
      }
    } as const
    if (tag.wrap) {
      return Effect_.withSpan(
        middleware({ ...options, next: tail }) as any,
        middlewareSpanName,
        middlewareSpanOptions
      ) as any
    }
    return tag.provides !== undefined
      ? Effect_.provideServiceEffect(
        tail,
        tag.provides as any,
        Effect_.withSpan(
          middleware(options) as any,
          middlewareSpanName,
          middlewareSpanOptions
        ) as any
      )
      : Effect_.zipRight(
        Effect_.withSpan(
          middleware(options) as any,
          middlewareSpanName,
          middlewareSpanOptions
        ),
        tail
      )
  }
  return buildChain(0)
}
