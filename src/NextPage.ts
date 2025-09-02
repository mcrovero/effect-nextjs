/**
 * @since 0.5.0
 */
import type * as Context_ from "effect/Context"
import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type { ParseError } from "effect/ParseResult"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import { executeWithRuntime } from "./internal/executor.js"
import { createMiddlewareChain } from "./internal/middleware-chain.js"
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
const NextPageSymbolKey = "@mcrovero/effect-nextjs/NextPage"

/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(NextPageSymbolKey)

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
  readonly searchParamsSchema?: AnySchema
}

type LayerSuccess<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

/**
 * @since 0.5.0
 * @category models
 */
export interface NextPage<
  in out Tag extends string,
  out L extends Layer.Layer<any, any, any>,
  out Middleware extends NextMiddleware.TagClassAny = never,
  out ParamsA = undefined,
  out SearchParamsA = undefined
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlyArray<Middleware>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly paramsSchema?: AnySchema
  readonly searchParamsSchema?: AnySchema

  withRuntime(runtime: ManagedRuntime.ManagedRuntime<any, any>): NextPage<Tag, L, Middleware, ParamsA, SearchParamsA>

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextPage<Tag, L, Middleware | M, ParamsA, SearchParamsA>

  setParamsSchema<S extends AnySchema>(schema: S): NextPage<Tag, L, Middleware, S["Type"], SearchParamsA>
  setSearchParamsSchema<S extends AnySchema>(schema: S): NextPage<Tag, L, Middleware, ParamsA, S["Type"]>

  /**
   * Build a pure Effect program without executing it. Useful for tests where
   * you want to provide services and run with a custom runtime.
   */
  buildEffect<
    E extends CatchesFromMiddleware<Middleware>,
    H extends BuildHandlerWithError<NextPage<Tag, L, Middleware, ParamsA, SearchParamsA>, E>
  >(
    handler: H
  ): (
    props: {
      readonly params: Promise<Record<string, string | undefined>>
      readonly searchParams: Promise<Record<string, string | undefined>>
    }
  ) => Effect<
    ReturnType<H> extends Effect<infer _A, any, any> ? _A | WrappedReturns<Middleware> : never,
    E,
    ExtractProvides<NextPage<Tag, L, Middleware, ParamsA, SearchParamsA>>
  >

  build<
    E extends CatchesFromMiddleware<Middleware>,
    H extends BuildHandlerWithError<NextPage<Tag, L, Middleware, ParamsA, SearchParamsA>, E>
  >(
    handler: H
  ): (
    props: {
      readonly params: Promise<Record<string, string | undefined>>
      readonly searchParams: Promise<Record<string, string | undefined>>
    }
  ) => Promise<ReturnType<H> extends Effect<infer _A, any, any> ? _A | WrappedReturns<Middleware> : never>
}

/**
 * @since 0.5.0
 * @category models
 */
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
      ...(this.paramsSchema !== undefined ? { paramsSchema: this.paramsSchema } as const : {}),
      ...(this.searchParamsSchema !== undefined ? { searchParamsSchema: this.searchParamsSchema } as const : {})
    })
  },
  middleware(this: AnyWithProps, middleware: NextMiddleware.TagClassAny) {
    return makeProto({
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: [...this.middlewares, middleware],
      ...(this.paramsSchema !== undefined ? { paramsSchema: this.paramsSchema } as const : {}),
      ...(this.searchParamsSchema !== undefined ? { searchParamsSchema: this.searchParamsSchema } as const : {})
    })
  },
  setParamsSchema(this: AnyWithProps, schema: AnySchema) {
    return makeProto({
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: this.middlewares,
      ...(schema !== undefined ? { paramsSchema: schema } as const : {}),
      ...(this.searchParamsSchema !== undefined
        ? { searchParamsSchema: this.searchParamsSchema } as const
        : {})
    })
  },
  setSearchParamsSchema(this: AnyWithProps, schema: AnySchema) {
    return makeProto({
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: this.middlewares,
      ...(this.paramsSchema !== undefined ? { paramsSchema: this.paramsSchema } as const : {}),
      ...(schema !== undefined ? { searchParamsSchema: schema } as const : {})
    })
  },

  buildEffect(
    this: AnyWithProps,
    handler: (ctx: any) => Effect<any, any, any>
  ) {
    const middlewares = this.middlewares
    const paramsSchema = this.paramsSchema
    const searchParamsSchema = this.searchParamsSchema
    const spanNameLocal = this._tag
    const spanAttributesLocal = makeSpanAttributes("NextPage", this._tag)
    return (props: {
      readonly params: Promise<Record<string, string | undefined>>
      readonly searchParams: Promise<Record<string, string | undefined>>
    }) => {
      const rawParams = props?.params ?? Promise.resolve({})
      const rawSearchParams = props?.searchParams ?? Promise.resolve({})
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
        } as any

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
            spanNameLocal,
            spanAttributesLocal,
            options
          )
        }
        return yield* handlerEffect
      }) as any
    }
  },

  build(
    this: AnyWithProps,
    handler: (ctx: any) => Effect<any, any, any>
  ) {
    const runtime = this.runtime
    const spanName = this._tag
    const spanAttributes = makeSpanAttributes("NextPage", this._tag)
    const errorDef = captureDefinitionSite()
    return async (props: {
      readonly params: Promise<Record<string, string | undefined>>
      readonly searchParams: Promise<Record<string, string | undefined>>
    }) => {
      const errorCall = captureCallSite()
      const program = Proto.buildEffect.call(this, handler)(props)

      const effectWithSpan = Effect_.withSpan(program as Effect<any, any, any>, spanName, {
        captureStackTrace: makeCaptureCallSite(errorDef, errorCall),
        attributes: spanAttributes
      })

      /**
       * In development we use global registry to get the runtime
       * to support hot-reloading.
       */
      const actualRuntime = getRuntime(`${NextPageSymbolKey}/${this._tag}`, runtime)

      // Workaround to handle redirect errors
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
  readonly searchParamsSchema?: AnySchema
}): NextPage<Tag, L, Middleware> => {
  function NextPage() {}
  Object.setPrototypeOf(NextPage, Proto)
  Object.assign(NextPage, options)
  NextPage.key = `${NextPageSymbolKey}/${options._tag}`
  return NextPage as any
}

/**
 * @since 0.5.0
 * @category constructors
 */
export const make = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, never>
>(tag: Tag, layer: L): NextPage<Tag, L> => {
  const runtime = ManagedRuntime.make(layer)

  // Register the runtime in the global registry for development mode (HMR support)
  setRuntime(`${NextPageSymbolKey}/${tag}`, runtime)

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
export type ExtractProvides<R extends Any> = R extends NextPage<
  infer _Tag,
  infer _Layer,
  infer _Middleware,
  infer _ParamsA,
  infer _SearchParamsA
> ?
    | LayerSuccess<_Layer>
    | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

/**
 * @since 0.5.0
 * @category models
 */
export type ExcludeProvides<Env, R extends Any> = Exclude<Env, ExtractProvides<R>>

export type Params<P extends Any> = P extends
  NextPage<infer _Tag, infer _Layer, infer _Middleware, infer _ParamsA, infer _SearchParamsA> ?
  _ParamsA extends undefined ? Effect<Readonly<Record<string, string | undefined>>, never, never>
  : Effect<_ParamsA, ParseError, never>
  : never

export type SearchParams<P extends Any> = P extends
  NextPage<infer _Tag, infer _Layer, infer _Middleware, infer _ParamsA, infer _SearchParamsA> ?
  _SearchParamsA extends undefined ? Effect<Readonly<Record<string, string | undefined>>, never, never>
  : Effect<_SearchParamsA, ParseError, never>
  : never

type CatchesFromMiddleware<M> = M extends { readonly catches: Schema.Schema<infer A, any, any> } ? A
  : never

type BuildHandlerWithError<P extends Any, E> = (
  request: {
    readonly params: Params<P>
    readonly searchParams: SearchParams<P>
  }
) => Effect<any, E, ExtractProvides<P>>

type InferSchemaOutput<S> = S extends Schema.Schema<infer A, any, any> ? A : never
type WrappedReturns<M> = M extends { readonly wrap: true }
  ? InferSchemaOutput<M extends { readonly returns: infer S } ? S : typeof Schema.Never>
  : never
