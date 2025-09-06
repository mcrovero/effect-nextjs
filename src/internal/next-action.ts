import * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import { type AnyWithProps } from "src/NextAction.js"
import { executeWithRuntime } from "./executor.js"
import { createMiddlewareChain } from "./middleware-chain.js"
import { getRuntime } from "./runtime-registry.js"
import { captureCallSite, captureDefinitionSite, makeCaptureCallSite, makeSpanAttributes } from "./stacktrace.js"

/**
 * @since 0.5.0
 * @category internal
 */
export const NextActionSymbolKey = "@mcrovero/effect-nextjs/NextAction"

export function internalBuild<
  O
>(
  outerThis: AnyWithProps,
  programEffect: Effect<O, any, any>,
  { errorDef, spanName, traced }: {
    readonly traced: boolean
    readonly spanName?: string | undefined
    readonly errorDef?: Error | undefined
  }
): Promise<O> {
  const runtime = outerThis.runtime
  const actualSpanName = spanName || outerThis._tag
  const spanAttributes = makeSpanAttributes(outerThis._tag)
  const middlewares = outerThis.middlewares

  const program = Effect_.gen(function*() {
    const context = yield* Effect_.context<never>()

    let handlerEffect = programEffect

    if (middlewares.length > 0) {
      const options = {
        callerKind: "action" as const
      }
      const tags = middlewares
      handlerEffect = createMiddlewareChain(
        tags,
        (tag) => Context_.unsafeGet(context, tag),
        handlerEffect,
        options
      )
    }
    return yield* handlerEffect
  })
  let effect = program
  if (traced) {
    const def = errorDef ?? captureDefinitionSite()
    const errorCall = captureCallSite()
    effect = Effect_.withSpan(program, actualSpanName, {
      captureStackTrace: makeCaptureCallSite(def, errorCall),
      attributes: spanAttributes
    })
  }
  /**
   * In development we use global registry to get the runtime
   * to support hot-reloading.
   */
  const actualRuntime = getRuntime(`${NextActionSymbolKey}/${outerThis._tag}`, runtime)

  // Workaround to handle redirect errors
  return executeWithRuntime(actualRuntime, effect as Effect<any, any, never>)
}
