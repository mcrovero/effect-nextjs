import { Cause, Exit, type Layer } from "effect"
import * as Context from "effect/Context"
import type * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import * as Schema_ from "effect/Schema"
import type * as AST from "effect/SchemaAST"
// import type { Scope } from "effect/Scope"
import type * as NextMiddleware from "./NextMiddleware.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mattiacrovero/effect-nextjs/Rpc")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
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
 * @since 1.0.0
 * @category models
 */
export interface AnyWithProps {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAnyWithProps>
  readonly layer: Layer.Layer<any, any, any>
  readonly paramsSchema?: AnySchema
  readonly searchParamsSchema?: AnySchema
}

type LayerSuccess<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

export interface NextPage<
  in out Tag extends string,
  in out L extends Layer.Layer<any, any, any>,
  out Middleware extends NextMiddleware.TagClassAny = never,
  out ParamsA = undefined,
  out SearchParamsA = undefined
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlyArray<Middleware>
  readonly layer: L
  readonly paramsSchema?: AnySchema
  readonly searchParamsSchema?: AnySchema

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextPage<Tag, L, Middleware | M, ParamsA, SearchParamsA>

  setParamsSchema<S extends AnySchema>(schema: S): NextPage<Tag, L, Middleware, S["Type"], SearchParamsA>
  setSearchParamsSchema<S extends AnySchema>(schema: S): NextPage<Tag, L, Middleware, ParamsA, S["Type"]>

  build<
    InnerHandler extends HandlerFrom<NextPage<Tag, L, Middleware, ParamsA, SearchParamsA>>,
    OnError = never
  >(
    handler: InnerHandler,
    onError?: (
      error: MiddlewareErrors<Middleware> | HandlerError<InnerHandler>
    ) => OnError
  ): (
    props?: {
      readonly params?: Promise<Record<string, string>>
      readonly searchParams?: Promise<Record<string, string>>
    }
  ) => Promise<
    | (ReturnType<InnerHandler> extends Effect<infer _A, any, any> ? _A : never)
    | OnError
  >
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly layer: Layer.Layer<any, any, any>
  readonly paramsSchema?: AnySchema
  readonly searchParamsSchema?: AnySchema
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  middleware(this: AnyWithProps, middleware: NextMiddleware.TagClassAny) {
    return makeProto({
      _tag: this._tag,
      layer: this.layer,
      middlewares: [...this.middlewares, middleware]
    })
  },
  setParamsSchema(this: AnyWithProps, schema: AnySchema) {
    const options = {
      _tag: this._tag,
      layer: this.layer,
      middlewares: this.middlewares,
      ...(schema !== undefined ? { paramsSchema: schema } as const : {}),
      ...(this.searchParamsSchema !== undefined
        ? { searchParamsSchema: this.searchParamsSchema } as const
        : {})
    }
    return makeProto(options)
  },
  setSearchParamsSchema(this: AnyWithProps, schema: AnySchema) {
    const options = {
      _tag: this._tag,
      layer: this.layer,
      middlewares: this.middlewares,
      ...(this.paramsSchema !== undefined ? { paramsSchema: this.paramsSchema } as const : {}),
      ...(schema !== undefined ? { searchParamsSchema: schema } as const : {})
    }
    return makeProto(options)
  },

  build(
    this: AnyWithProps,
    handler: (ctx: any) => Effect<any, any, any>,
    onError?: (error: unknown) => unknown
  ) {
    const middlewares = this.middlewares
    const layer = this.layer
    const paramsSchema = this.paramsSchema
    const searchParamsSchema = this.searchParamsSchema
    return (props?: {
      readonly params?: Promise<Record<string, string>>
      readonly searchParams?: Promise<Record<string, string>>
    }) => {
      const program = Effect_.gen(function*() {
        const context = yield* Effect_.context<never>()
        const payload = yield* Effect_.gen(function*() {
          const rawParams = props?.params !== undefined
            ? yield* Effect_.promise(() => props!.params as Promise<Record<string, string>>)
            : undefined
          const decodedParams = paramsSchema && rawParams !== undefined
            ? yield* (Schema_ as any).decodeUnknown(paramsSchema)(rawParams)
            : rawParams
          const rawSearchParams = props?.searchParams !== undefined
            ? yield* Effect_.promise(() => props!.searchParams as Promise<Record<string, string>>)
            : undefined
          const decodedSearchParams = searchParamsSchema && rawSearchParams !== undefined
            ? yield* (Schema_ as any).decodeUnknown(searchParamsSchema)(rawSearchParams)
            : rawSearchParams
          return { params: decodedParams, searchParams: decodedSearchParams }
        })
        let handlerEffect = handler(payload as any) as Effect<any, any, any>
        if (middlewares.length > 0) {
          const options = {
            _type: "page" as const,
            params: props?.params ?? Promise.resolve({} as Record<string, string>),
            searchParams: props?.searchParams
          }
          const tags = middlewares as ReadonlyArray<any>
          const buildChain = (index: number): Effect<any, any, any> => {
            if (index >= tags.length) {
              return handlerEffect
            }
            const tag = tags[index] as any
            const middleware = Context.unsafeGet(context, tag) as any
            const tail = buildChain(index + 1)
            if (tag.wrap) {
              return middleware({ ...options, next: tail }) as any
            }
            if (tag.optional) {
              return Effect_.matchEffect(middleware(options), {
                onFailure: () => tail,
                onSuccess: tag.provides !== undefined
                  ? (value: any) => Effect_.provideService(tail, tag.provides as any, value)
                  : () => tail
              })
            }
            return tag.provides !== undefined
              ? Effect_.provideServiceEffect(tail, tag.provides as any, middleware(options))
              : Effect_.zipRight(middleware(options), tail)
          }
          handlerEffect = buildChain(0)
        }
        return yield* handlerEffect
      }).pipe(Effect_.provide(layer))

      const handled = Effect_.matchEffect(program as Effect<any, any, never>, {
        onFailure: (error) => Effect_.succeed(onError ? onError(error) : error),
        onSuccess: (value) => Effect_.succeed(value)
      })

      // Workaround to handle redirect errors
      return Effect_.runPromiseExit(handled).then((result) => {
        if (Exit.isFailure(result)) {
          const mappedError = Cause.match<any, any>(result.cause, {
            onEmpty: () => {
              throw new Error("empty")
            },
            onFail: (error) => error,
            onDie: (defect) => {
              throw defect
            },
            onInterrupt: (fiberId) => {
              throw new Error(`Interrupted`, { cause: fiberId })
            },
            onSequential: (left, right) => {
              throw new Error(`Sequential (left: ${left}) (right: ${right})`)
            },
            onParallel: (left, right) => {
              throw new Error(`Parallel (left: ${left}) (right: ${right})`)
            }
          })
          if (onError) {
            return onError(mappedError) as any
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
  const L extends Layer.Layer<any, any, any>,
  Middleware extends NextMiddleware.TagClassAny
>(options: {
  readonly _tag: Tag
  readonly layer: L
  readonly middlewares: ReadonlyArray<Middleware>
  readonly paramsSchema?: AnySchema
  readonly searchParamsSchema?: AnySchema
}): NextPage<Tag, L, Middleware> => {
  function NextPage() {}
  Object.setPrototypeOf(NextPage, Proto)
  Object.assign(NextPage, options)
  NextPage.key = `@mattiacrovero/effect-nextjs/NextPage/${options._tag}`
  return NextPage as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, any>
>(
  tag: Tag,
  layer: L
): NextPage<Tag, L> => {
  return makeProto({
    _tag: tag,
    layer,
    middlewares: [] as Array<never>
  }) as any
}

/**
 * @since 1.0.0
 * @category models
 */
export type Middleware<R> = R extends NextPage<infer _Tag, infer _Layer, infer _Middleware>
  ? Context_.Tag.Identifier<_Middleware>
  : never

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlerFrom<P extends Any> = P extends Any ? ToHandlerFn<P> : never

/**
 * @since 1.0.0
 * @category models
 */
export type ExtractProvides<R extends Any> = R extends
  NextPage<infer _Tag, infer _Layer, infer _Middleware, infer _ParamsA, infer _SearchParamsA>
  ? LayerSuccess<_Layer> | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type ExcludeProvides<Env, R extends Any> = Exclude<Env, ExtractProvides<R>>

/**
 * Represents an implemented rpc.
 *
 * @since 1.0.0
 * @category models
 */
export interface Handler<Tag extends string> {
  readonly _: unique symbol
  readonly tag: Tag
  readonly handler: (request: any) => Effect<any, any>
}

/**
 * @since 1.0.0
 * @category models
 */
export type ToHandler<R extends Any> = R extends NextPage<infer _Tag, infer _Middleware> ? Handler<_Tag>
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type ToHandlerFn<R extends Any> = (request: {
  readonly params: Params<R>
  readonly searchParams: SearchParams<R>
}) => Effect<any, any, ExtractProvides<R>>

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlerContext<P extends Any, Handler> = Handler extends (
  ...args: any
) => Effect<infer _A, infer _E, infer _R> ? ExcludeProvides<_R, P>
  : never

export type Params<P extends Any> = P extends
  NextPage<infer _Tag, infer _Layer, infer _Middleware, infer ParamsA, infer _SearchParamsA> ?
  ParamsA extends undefined ? Promise<Record<string, string>> : ParamsA
  : never

export type SearchParams<P extends Any> = P extends
  NextPage<infer _Tag, infer _Layer, infer _Middleware, infer _ParamsA, infer SearchParamsA> ?
  SearchParamsA extends undefined ? Promise<Record<string, string>> : SearchParamsA
  : never

// Error typing helpers for build onError
type InferSchemaType<S> = S extends Schema.Schema<infer A, any, any> ? A : never

export type MiddlewareErrors<M> = M extends NextMiddleware.TagClassAny ? InferSchemaType<M["failure"]>
  : never

export type HandlerError<H> = H extends (
  ...args: any
) => Effect<infer _A, infer _E, any> ? _E :
  never
