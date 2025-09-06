import { Effect } from "effect"

/**
 * @since 0.5.0
 * @category utils
 */
export const captureDefinitionSite = (): Error => {
  const Err = Error as any
  const limit = Err.stackTraceLimit
  Err.stackTraceLimit = 2
  const errorDef = new Err()
  Err.stackTraceLimit = limit
  return errorDef
}

/**
 * @since 0.5.0
 * @category utils
 */
export const captureCallSite = (): Error => {
  const Err = Error as any
  const limit = Err.stackTraceLimit
  Err.stackTraceLimit = 2
  const errorCall = new Err()
  Err.stackTraceLimit = limit
  return errorCall
}

/**
 * @since 0.5.0
 * @category utils
 */
export const makeCaptureCallSite = (errorDef: Error, errorCall: Error): () => string | undefined => {
  let cache: false | string = false
  return () => {
    if (cache !== false) {
      return cache
    }
    if (errorCall.stack) {
      const stackDef = errorDef.stack!.trim().split("\n")
      const stackCall = errorCall.stack.trim().split("\n")
      let endStackDef = stackDef.slice(2).join("\n").trim()
      if (!endStackDef.includes(`(`)) {
        endStackDef = endStackDef.replace(/at (.*)/, "at ($1)")
      }
      let endStackCall = stackCall.slice(2).join("\n").trim()
      if (!endStackCall.includes(`(`)) {
        endStackCall = endStackCall.replace(/at (.*)/, "at ($1)")
      }
      cache = `${endStackDef}\n${endStackCall}`
      return cache
    }
  }
}

/**
 * @since 0.5.0
 * @category utils
 */
export const makeSpanAttributes = (
  component: "NextPage" | "NextLayout" | "NextAction" | "NextServerComponent",
  tag: string
): Readonly<{
  readonly library: "@mcrovero/effect-nextjs"
  readonly component: string
  readonly tag: string
}> =>
  ({
    library: "@mcrovero/effect-nextjs",
    component,
    tag
  }) as const

/**
 * @since 0.10.0
 * @category utils
 */
export const wrapWithSpan = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options: {
    readonly spanName: string
    readonly attributes: Readonly<{
      readonly library: "@mcrovero/effect-nextjs"
      readonly component: string
      readonly tag: string
    }>
  }
) => {
  const errorDef = captureDefinitionSite()
  const errorCall = captureCallSite()
  return Effect.withSpan(effect, options.spanName, {
    captureStackTrace: makeCaptureCallSite(errorDef, errorCall),
    attributes: options.attributes
  }) as Effect.Effect<A, E, R>
}
