import { Cause, Exit } from "effect"
import type * as Context_ from "effect/Context"
import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import { createMiddlewareChain } from "./internal/middleware-chain.js"
import type * as NextMiddleware from "./NextMiddleware.js"

/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mcrovero/effect-nextjs/ServerComponent")

/**
 * @since 0.5.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 0.5.0
 * @category models
 */
export interface AnyWithProps {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAnyWithProps>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
}

type RuntimeSuccess<R extends ManagedRuntime.ManagedRuntime<any, any>> = R extends
  ManagedRuntime.ManagedRuntime<infer ROut, any> ? ROut : never

export interface NextServerComponent<
  in out Tag extends string,
  in out Runtime extends ManagedRuntime.ManagedRuntime<any, any>,
  out Middleware extends NextMiddleware.TagClassAny = never
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlyArray<Middleware>
  readonly runtime: Runtime

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends RuntimeSuccess<Runtime> ? M : never
  ): NextServerComponent<Tag, Runtime, Middleware | M>

  // props-less variant
  build<Out, E extends CatchesFromMiddleware<Middleware>>(
    handler: () => Effect<Out, E, ExtractProvides<NextServerComponent<Tag, Runtime, Middleware>>>
  ): () => Promise<Out | WrappedReturns<Middleware>>

  // props variant (infers Props from handler parameter)
  build<Props, Out, E extends CatchesFromMiddleware<Middleware>>(
    handler: (props: Props) => Effect<Out, E, ExtractProvides<NextServerComponent<Tag, Runtime, Middleware>>>
  ): (props: Props) => Promise<Out | WrappedReturns<Middleware>>
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  middleware(this: AnyWithProps, middleware: NextMiddleware.TagClassAny) {
    return makeProto({
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: [...this.middlewares, middleware]
    })
  },

  build(
    this: AnyWithProps,
    handler: (ctx: any) => Effect<any, any, any>
  ) {
    const middlewares = this.middlewares
    const runtime = this.runtime
    return (props?: any) => {
      // Capture definition stack for tracing (definition site)
      const defLimit = (Error as any).stackTraceLimit
      ;(Error as any).stackTraceLimit = 2
      const errorDef = new Error()
      ;(Error as any).stackTraceLimit = defLimit
      const spanName = this._tag
      const spanAttributes = {
        library: "@mcrovero/effect-nextjs",
        component: "NextServerComponent",
        tag: this._tag
      } as const
      const program = Effect_.gen(function*() {
        const context = yield* Effect_.context<never>()
        let handlerEffect = handler(props as any) as Effect<any, any, any>
        if (middlewares.length > 0) {
          const options = { callerKind: "component" as const }
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
      })

      // Capture call stack for tracing (call site) and create span
      const callLimit = (Error as any).stackTraceLimit
      ;(Error as any).stackTraceLimit = 2
      const errorCall = new Error()
      ;(Error as any).stackTraceLimit = callLimit
      let cache: false | string = false
      const captureStackTrace = () => {
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
      const traced = Effect_.withSpan(program as Effect<any, any, any>, spanName, {
        captureStackTrace,
        attributes: spanAttributes
      })

      /**
       * Workaround to handle redirect errors
       */
      return runtime.runPromiseExit(traced as Effect<any, any, never>).then((result) => {
        if (Exit.isFailure(result)) {
          const mappedError = Cause.match<any, any>(result.cause, {
            onEmpty: () => new Error("empty"),
            onFail: (error) => error,
            onDie: (defect) => defect,
            onInterrupt: (fiberId) => new Error(`Interrupted`, { cause: fiberId }),
            onSequential: (left, right) => new Error(`Sequential (left: ${left}) (right: ${right})`),
            onParallel: (left, right) => new Error(`Parallel (left: ${left}) (right: ${right})`)
          })

          // Replace the stack with the effect stacktrace
          const effectPretty = Cause.pretty(result.cause as any)
          if (effectPretty && typeof effectPretty === "string") {
            mappedError.stack = effectPretty
          }
          throw mappedError
        }
        return result.value
      })
    }
  }
}

const makeProto = <
  const Tag extends string,
  const Runtime extends ManagedRuntime.ManagedRuntime<any, any>,
  Middleware extends NextMiddleware.TagClassAny
>(options: {
  readonly _tag: Tag
  readonly runtime: Runtime
  readonly middlewares: ReadonlyArray<Middleware>
}): NextServerComponent<Tag, Runtime, Middleware> => {
  function NextServerComponent() {}
  Object.setPrototypeOf(NextServerComponent, Proto)
  Object.assign(NextServerComponent, options)
  NextServerComponent.key = `@mcrovero/effect-nextjs/NextServerComponent/${options._tag}`
  return NextServerComponent as any
}

/**
 * @since 0.5.0
 * @category constructors
 */
export const make = <
  const Tag extends string,
  const Runtime extends ManagedRuntime.ManagedRuntime<any, any>
>(
  tag: Tag,
  runtime: Runtime
): NextServerComponent<Tag, Runtime> => {
  return makeProto({
    _tag: tag,
    runtime,
    middlewares: [] as Array<never>
  }) as any
}

/**
 * @since 0.5.0
 * @category models
 */
type ExtractProvides<R extends Any> = R extends NextServerComponent<infer _Tag, infer _Runtime, infer _Middleware>
  ? RuntimeSuccess<_Runtime> | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

type CatchesFromMiddleware<M> = M extends { readonly catches: Schema.Schema<infer A, any, any> } ? A
  : never

type InferSchemaOutput<S> = S extends Schema.Schema<infer A, any, any> ? A : never
type WrappedReturns<M> = M extends { readonly wrap: true }
  ? InferSchemaOutput<M extends { readonly returns: infer S } ? S : typeof Schema.Never>
  : never
