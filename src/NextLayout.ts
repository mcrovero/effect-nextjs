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
import type * as AST from "effect/SchemaAST"
import { executeWithRuntime } from "./internal/executor.js"
import { buildLayoutEffect } from "./internal/next-layout.js"
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
const NextLayoutSymbolKey = "@mcrovero/effect-nextjs/NextLayout"

/**
 * @since 0.5.0
 * @category models
 */
export interface NextLayoutBaseProps {
  readonly params: Promise<Record<string, string | Array<string> | undefined>>
  readonly children?: any
}

/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(NextLayoutSymbolKey)

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
export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
}

export interface AnyWithProps {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAnyWithProps>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly paramsSchema?: AnySchema
}

type LayerSuccess<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

export interface NextLayout<
  in out Tag extends string,
  out L extends Layer.Layer<any, any, any>,
  out Middleware extends NextMiddleware.TagClassAny = never,
  out ParamsA = undefined
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlyArray<Middleware>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly paramsSchema?: AnySchema

  withRuntime(runtime: ManagedRuntime.ManagedRuntime<any, any>): NextLayout<Tag, L, Middleware, ParamsA>

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextLayout<Tag, L, Middleware | M, ParamsA>

  setParamsSchema<S extends AnySchema>(schema: S): NextLayout<Tag, L, Middleware, S["Type"]>

  build<
    P extends NextLayoutBaseProps = NextLayoutBaseProps,
    E extends CatchesFromMiddleware<Middleware> = CatchesFromMiddleware<Middleware>,
    H extends BuildHandlerWithError<NextLayout<Tag, L, Middleware, ParamsA>, E, P> = BuildHandlerWithError<
      NextLayout<Tag, L, Middleware, ParamsA>,
      E,
      P
    >
  >(
    handler: H
  ): (props: P) => Promise<ReturnType<H> extends Effect<infer _A, any, any> ? _A | WrappedReturns<Middleware> : never>
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
      ...(this.paramsSchema !== undefined ? { paramsSchema: this.paramsSchema } as const : {})
    })
  },
  middleware(this: AnyWithProps, middleware: NextMiddleware.TagClassAny) {
    return makeProto({
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: [...this.middlewares, middleware]
    })
  },
  setParamsSchema(this: AnyWithProps, schema: AnySchema) {
    return makeProto({
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: this.middlewares,
      ...(schema !== undefined ? { paramsSchema: schema } as const : {})
    })
  },
  build<
    P extends NextLayoutBaseProps = NextLayoutBaseProps,
    E extends CatchesFromMiddleware<any> = CatchesFromMiddleware<any>,
    H extends BuildHandlerWithError<any, E, P> = BuildHandlerWithError<any, E, P>
  >(
    this: AnyWithProps,
    handler: H
  ) {
    const runtime = this.runtime
    const spanName = this._tag
    const spanAttributes = makeSpanAttributes("NextLayout", this._tag)
    const errorDef = captureDefinitionSite()
    return async (props: P) => {
      const errorCall = captureCallSite()
      const program = buildLayoutEffect<P, E, H>(
        {
          middlewares: this.middlewares as ReadonlyArray<any>,
          paramsSchema: this.paramsSchema as any,
          spanName,
          spanAttributes
        },
        handler as any
      )(props)

      const effectWithSpan = Effect_.withSpan(program, spanName, {
        captureStackTrace: makeCaptureCallSite(errorDef, errorCall),
        attributes: spanAttributes
      })

      /**
       * In development we use global registry to get the runtime
       * to support hot-reloading.
       */
      const actualRuntime = getRuntime(`${NextLayoutSymbolKey}/${this._tag}`, runtime)

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
  readonly paramsSchema?: AnySchema
}): NextLayout<Tag, L, Middleware> => {
  function NextLayout() {}
  Object.setPrototypeOf(NextLayout, Proto)
  Object.assign(NextLayout, options)
  NextLayout.key = `${NextLayoutSymbolKey}/${options._tag}`
  return NextLayout as any
}

/**
 * @since 0.5.0
 * @category constructors
 */
export const make = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, never>
>(tag: Tag, layer: L): NextLayout<Tag, L> => {
  const runtime = ManagedRuntime.make(layer)

  // Register the runtime in the global registry for development mode (HMR support)
  setRuntime(`${NextLayoutSymbolKey}/${tag}`, runtime)

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
type ExtractProvides<R extends Any> = R extends NextLayout<
  infer _Tag,
  infer _Layer,
  infer _Middleware,
  infer _ParamsA
> ?
    | LayerSuccess<_Layer>
    | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

export type Params<P extends Any> = P extends NextLayout<
  infer _Tag,
  infer _Layer,
  infer _Middleware,
  infer _ParamsA
> ?
  _ParamsA extends undefined ?
    Effect_.Effect<Readonly<Record<string, string | Array<string> | undefined>>, never, never>
  : Effect_.Effect<_ParamsA, ParseError, never>
  : never

// Allowed errors are from wrapped middlewares' catches schema (otherwise never)
type CatchesFromMiddleware<M> = M extends { readonly catches: Schema.Schema<infer A, any, any> } ? A
  : never

// Helper to constrain a layout handler's error to an allowed schema-derived type
type BuildHandlerWithError<P extends Any, E, Props = NextLayoutBaseProps> = (
  request: Omit<Props, "params"> & {
    readonly params: Params<P>
  }
) => Effect<any, E, ExtractProvides<P>>

// Collect the union of "returns" value types from wrapped middlewares' Schema
type InferSchemaOutput<S> = S extends Schema.Schema<infer A, any, any> ? A : never
type WrappedReturns<M> = M extends { readonly wrap: true }
  ? InferSchemaOutput<M extends { readonly returns: infer S } ? S : typeof Schema.Never>
  : never
