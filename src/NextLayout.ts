import { Cause, Exit } from "effect"
import * as Context from "effect/Context"
import type * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import type { ParseError } from "effect/ParseResult"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import { createMiddlewareChain } from "./internal/middleware-chain.js"
import type * as NextMiddleware from "./NextMiddleware.js"

/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mcrovero/effect-nextjs/Layout")

/**
 * @since 0.5.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 0.5.0
 * @category constructors
 */
export interface AnySchema extends Pipeable {
  readonly [Schema.TypeId]: any
  readonly Type: any
  readonly Encoded: any
  readonly Context: any
  readonly make?: (params: any, ...rest: ReadonlyArray<any>) => any
  readonly ast: AST.AST
}

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
  readonly paramsSchema?: AnySchema
}

type RuntimeSuccess<R extends ManagedRuntime.ManagedRuntime<any, any>> = R extends
  ManagedRuntime.ManagedRuntime<infer ROut, any> ? ROut : never

export interface NextLayout<
  in out Tag extends string,
  in out Runtime extends ManagedRuntime.ManagedRuntime<any, any>,
  out Middleware extends NextMiddleware.TagClassAny = never,
  out ParamsA = undefined
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlyArray<Middleware>
  readonly runtime: Runtime
  readonly paramsSchema?: AnySchema

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends RuntimeSuccess<Runtime> ? M : never
  ): NextLayout<Tag, Runtime, Middleware | M, ParamsA>

  setParamsSchema<S extends AnySchema>(schema: S): NextLayout<Tag, Runtime, Middleware, S["Type"]>

  build<
    E extends CatchesFromMiddleware<Middleware>,
    H extends BuildHandlerWithError<NextLayout<Tag, Runtime, Middleware, ParamsA>, E>
  >(
    handler: H
  ): (
    props: {
      readonly params: Promise<Record<string, string | undefined>>
      readonly children?: any
    }
  ) => Promise<ReturnType<H> extends Effect<infer _A, any, any> ? _A | WrappedReturns<Middleware> : never>
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly paramsSchema?: AnySchema
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
  setParamsSchema(this: AnyWithProps, schema: AnySchema) {
    const options = {
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: this.middlewares,
      ...(schema !== undefined ? { paramsSchema: schema } as const : {})
    }
    return makeProto(options)
  },

  build(
    this: AnyWithProps,
    handler: (ctx: any) => Effect<any, any, any>
  ) {
    const middlewares = this.middlewares
    const runtime = this.runtime
    const paramsSchema = this.paramsSchema
    // Capture definition stack for tracing (definition site)
    const defLimit = (Error as any).stackTraceLimit
    ;(Error as any).stackTraceLimit = 2
    const errorDef = new Error()
    ;(Error as any).stackTraceLimit = defLimit
    const spanName = this._tag
    const spanAttributes = {
      library: "@mcrovero/effect-nextjs",
      component: "NextLayout",
      tag: this._tag
    } as const
    return async (props: {
      readonly params: Promise<Record<string, string | undefined>>
      readonly children?: any
    }) => {
      // Capture call stack for tracing (call site)
      const callLimit = (Error as any).stackTraceLimit
      ;(Error as any).stackTraceLimit = 2
      const errorCall = new Error()
      ;(Error as any).stackTraceLimit = callLimit
      const rawParams = props?.params ?? Promise.resolve({})
      const program = Effect_.gen(function*() {
        const context = yield* Effect_.context<never>()
        const paramsEffect = paramsSchema
          ? Effect_.promise(() => rawParams).pipe(
            Effect_.flatMap((value: any) => Schema.decodeUnknown(paramsSchema as any)(value))
          )
          : Effect_.promise(() => rawParams)
        const payload = { params: paramsEffect, children: props?.children } as any

        let handlerEffect = handler(payload as any) as Effect<any, any, any>
        if (middlewares.length > 0) {
          const options = { callerKind: "layout" as const, params: rawParams, children: props?.children }
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

      // Create span and attach combined stacktrace (definition + call sites)
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
  readonly paramsSchema?: AnySchema
}): NextLayout<Tag, Runtime, Middleware> => {
  function NextLayout() {}
  Object.setPrototypeOf(NextLayout, Proto)
  Object.assign(NextLayout, options)
  NextLayout.key = `@mcrovero/effect-nextjs/NextLayout/${options._tag}`
  return NextLayout as any
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
): NextLayout<Tag, Runtime> => {
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
type ExtractProvides<R extends Any> = R extends
  NextLayout<infer _Tag, infer _Runtime, infer _Middleware, infer _ParamsA>
  ? RuntimeSuccess<_Runtime> | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

export type Params<P extends Any> = P extends
  NextLayout<infer _Tag, infer _Runtime, infer _Middleware, infer _ParamsA> ?
  _ParamsA extends undefined ? Effect_.Effect<Readonly<Record<string, string | undefined>>, never, never>
  : Effect_.Effect<_ParamsA, ParseError, never>
  : never

// Allowed errors are from wrapped middlewares' catches schema (otherwise never)
type CatchesFromMiddleware<M> = M extends { readonly catches: Schema.Schema<infer A, any, any> } ? A
  : never

// Helper to constrain a layout handler's error to an allowed schema-derived type
type BuildHandlerWithError<P extends Any, E> = (
  request: {
    readonly params: Params<P>
    readonly children: any
  }
) => Effect<any, E, ExtractProvides<P>>

// Collect the union of "returns" value types from wrapped middlewares' Schema
type InferSchemaOutput<S> = S extends Schema.Schema<infer A, any, any> ? A : never
type WrappedReturns<M> = M extends { readonly wrap: true }
  ? InferSchemaOutput<M extends { readonly returns: infer S } ? S : typeof Schema.Never>
  : never
