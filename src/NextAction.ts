/**
 * @since 0.5.0
 */
import type * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type { ParseError } from "effect/ParseResult"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import { executeWithRuntime } from "./internal/executor.js"
import { buildActionEffect } from "./internal/next-action.js"
import { getRuntime, setRuntime } from "./internal/runtime-registry.js"
import {
  captureCallSite,
  captureDefinitionSite,
  makeCaptureCallSite,
  makeSpanAttributes
} from "./internal/stacktrace.js"
import type * as NextMiddleware from "./NextMiddleware.js"

/**
 * @since 0.5.0
 * @category constants
 */
const NextActionSymbolKey = "@mcrovero/effect-nextjs/NextAction"

/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(NextActionSymbolKey)

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
  readonly inputSchema?: Schema.Schema.All
}

type LayerSuccess<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

export interface NextAction<
  in out Tag extends string,
  out L extends Layer.Layer<any, any, any>,
  out Middleware extends NextMiddleware.TagClassAny = never,
  in InputA = undefined
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlyArray<Middleware>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly inputSchema?: Schema.Schema.All

  withRuntime(runtime: ManagedRuntime.ManagedRuntime<any, any>): NextAction<Tag, L, Middleware, InputA>

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextAction<Tag, L, Middleware | M, InputA>

  setInputSchema<S extends Schema.Schema.All>(schema: S): NextAction<Tag, L, Middleware, S>

  build<
    E extends CatchesFromMiddleware<Middleware>,
    H extends BuildHandlerWithError<NextAction<Tag, L, Middleware, InputA>, E>
  >(
    handler: H
  ): (
    input: Input<NextAction<Tag, L, Middleware, InputA>>
  ) => Promise<(ReturnType<H> extends Promise<Effect<infer _A, any, any>> ? _A | WrappedReturns<Middleware> : never)>
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly inputSchema?: Schema.Schema.All
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  withRuntime(this: AnyWithProps, runtime: ManagedRuntime.ManagedRuntime<any, any>) {
    return makeProto({
      _tag: this._tag,
      runtime,
      middlewares: this.middlewares,
      ...(this.inputSchema !== undefined ? { inputSchema: this.inputSchema } as const : {})
    })
  },
  middleware(this: AnyWithProps, middleware: NextMiddleware.TagClassAny) {
    return makeProto({
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: [...this.middlewares, middleware],
      ...(this.inputSchema !== undefined ? { inputSchema: this.inputSchema } as const : {})
    })
  },
  setInputSchema(this: AnyWithProps, schema: Schema.Schema.All) {
    return makeProto({
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: this.middlewares,
      ...(schema !== undefined ? { inputSchema: schema } as const : {})
    })
  },

  build(
    this: AnyWithProps,
    handler: (ctx: any) => Promise<Effect<any, any, any>>
  ) {
    const runtime = this.runtime
    const spanName = this._tag
    const spanAttributes = makeSpanAttributes("NextAction", this._tag)
    const errorDef = captureDefinitionSite()
    return async (inputArg: unknown) => {
      const errorCall = captureCallSite()
      const program = buildActionEffect(
        {
          middlewares: this.middlewares as ReadonlyArray<any>,
          inputSchema: this.inputSchema as any,
          spanName,
          spanAttributes
        },
        handler as any
      )(inputArg)

      const effectWithSpan = Effect_.withSpan(program, spanName, {
        captureStackTrace: makeCaptureCallSite(errorDef, errorCall),
        attributes: spanAttributes
      })

      /**
       * In development we use global registry to get the runtime
       * to support hot-reloading.
       */
      const actualRuntime = getRuntime(`${NextActionSymbolKey}/${this._tag}`, runtime)

      return executeWithRuntime(actualRuntime, effectWithSpan as Effect<any, any, never>)
    }
  }
}

const makeProto = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, any>,
  Middleware extends NextMiddleware.TagClassAny
>(options: {
  readonly _tag: Tag
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly middlewares: ReadonlyArray<Middleware>
  readonly inputSchema?: Schema.Schema.All
}): NextAction<Tag, L, Middleware> => {
  function NextAction() {}
  Object.setPrototypeOf(NextAction, Proto)
  Object.assign(NextAction, options)
  NextAction.key = `${NextActionSymbolKey}/${options._tag}`
  return NextAction as any
}

/**
 * @since 0.5.0
 * @category constructors
 */
export const make = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, never>
>(tag: Tag, layer: L): NextAction<Tag, L> => {
  const runtime = ManagedRuntime.make(layer)

  // Register the runtime in the global registry for development mode (HMR support)
  setRuntime(`${NextActionSymbolKey}/${tag}`, runtime)

  return makeProto({
    _tag: tag,
    runtime,
    middlewares: [] as Array<never>
  })
}

/**
 * @since 0.5.0
 * @category models
 */
type ExtractProvides<R extends Any> = R extends NextAction<
  infer _Tag,
  infer _Layer,
  infer _Middleware,
  infer _InputA
> ? LayerSuccess<_Layer> | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

type Input<P extends Any> = P extends NextAction<infer _Tag, infer _Layer, infer _Middleware, infer InputA> ?
  InputA extends Schema.Schema<infer _type, infer encoded, infer _c> ? encoded : unknown
  : never

type HandlerInputEffect<P extends Any> = P extends
  NextAction<infer _Tag, infer _Layer, infer _Middleware, infer InputA> ?
  (InputA extends Schema.Schema<infer type, infer _encoded, infer _c> ? Effect<type, ParseError, never> : unknown)
  : never

// Allowed errors are from wrapped middlewares' catches schema (otherwise never)
type CatchesFromMiddleware<M> = M extends { readonly catches: Schema.Schema<infer A, any, any> } ? A
  : never

// Helper to constrain an action handler's error to an allowed schema-derived type
type BuildHandlerWithError<P extends Any, E> = (
  request: {
    readonly input: HandlerInputEffect<P>
  }
) => Promise<Effect<any, E, ExtractProvides<P>>>

// Collect the union of "returns" value types from wrapped middlewares' Schema
type InferSchemaOutput<S> = S extends Schema.Schema<infer A, any, any> ? A : never
type WrappedReturns<M> = M extends { readonly wrap: true }
  ? InferSchemaOutput<M extends { readonly returns: infer S } ? S : typeof Schema.Never>
  : never
