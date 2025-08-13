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
import type * as NextMiddleware from "./NextMiddleware.js"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"

export const TypeId: unique symbol = Symbol.for("@mattiacrovero/effect-nextjs/Route")
export type TypeId = typeof TypeId

export interface AnySchema extends Pipeable {
  readonly [Schema.TypeId]: any
  readonly Type: any
  readonly Encoded: any
  readonly Context: any
  readonly make?: (params: any, ...rest: ReadonlyArray<any>) => any
  readonly ast: AST.AST
}

export interface AnyWithProps {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly layer: Layer.Layer<any, any, any>
}

type LayerSuccess<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

export interface NextRoute<in out Tag extends string, in out L extends Layer.Layer<any, any, any>> extends Pipeable {
  new(_: never): object
  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly layer: L
  GET: () => NextRouteMethod<Tag, L, "GET">
  POST: () => NextRouteMethod<Tag, L, "POST">
  PUT: () => NextRouteMethod<Tag, L, "PUT">
  PATCH: () => NextRouteMethod<Tag, L, "PATCH">
  DELETE: () => NextRouteMethod<Tag, L, "DELETE">
  HEAD: () => NextRouteMethod<Tag, L, "HEAD">
  OPTIONS: () => NextRouteMethod<Tag, L, "OPTIONS">
}

export interface NextRouteMethod<
  in out Tag extends string,
  in out L extends Layer.Layer<any, any, any>,
  Method extends HttpMethod,
  out Middleware extends NextMiddleware.TagClassAny = never,
  out ParamsA = undefined
> extends Pipeable {
  new(_: never): object
  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly method: Method
  readonly middlewares: ReadonlyArray<Middleware>
  readonly layer: L
  readonly paramsSchema?: AnySchema
  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextRouteMethod<Tag, L, Method, Middleware | M, ParamsA>
  setParamsSchema<S extends AnySchema>(schema: S): NextRouteMethod<Tag, L, Method, Middleware, S["Type"]>
  run<InnerHandler extends HandlerFrom<NextRouteMethod<Tag, L, Method, Middleware, ParamsA>>, OnError = never>(
    build: InnerHandler,
    onError?: (
      error: MiddlewareErrors<Middleware> | HandlerError<InnerHandler>
    ) => OnError
  ): (
    request: Request,
    ctx?: { readonly params?: Promise<Record<string, string>> }
  ) => Promise<
    | (ReturnType<InnerHandler> extends Effect<infer _A, any, any> ? _A : never)
    | OnError
  >
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly method: HttpMethod
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly layer: Layer.Layer<any, any, any>
  readonly paramsSchema?: AnySchema
}

const RouteProto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  GET(this: AnyWithProps) {
    return makeRouteMethod({ _tag: this._tag, key: this.key, layer: this.layer, method: "GET", middlewares: [] })
  },
  POST(this: AnyWithProps) {
    return makeRouteMethod({ _tag: this._tag, key: this.key, layer: this.layer, method: "POST", middlewares: [] })
  },
  PUT(this: AnyWithProps) {
    return makeRouteMethod({ _tag: this._tag, key: this.key, layer: this.layer, method: "PUT", middlewares: [] })
  },
  PATCH(this: AnyWithProps) {
    return makeRouteMethod({ _tag: this._tag, key: this.key, layer: this.layer, method: "PATCH", middlewares: [] })
  },
  DELETE(this: AnyWithProps) {
    return makeRouteMethod({ _tag: this._tag, key: this.key, layer: this.layer, method: "DELETE", middlewares: [] })
  },
  HEAD(this: AnyWithProps) {
    return makeRouteMethod({ _tag: this._tag, key: this.key, layer: this.layer, method: "HEAD", middlewares: [] })
  },
  OPTIONS(this: AnyWithProps) {
    return makeRouteMethod({ _tag: this._tag, key: this.key, layer: this.layer, method: "OPTIONS", middlewares: [] })
  }
}

const makeRouteProto = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, any>
>(options: { readonly _tag: Tag; readonly layer: L; readonly key: string }): NextRoute<Tag, L> => {
  function NextRoute() {}
  Object.setPrototypeOf(NextRoute, RouteProto)
  Object.assign(NextRoute, options)
  return NextRoute as any
}

export const make = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, any>
>(
  tag: Tag,
  layer: L
): NextRoute<Tag, L> => {
  return makeRouteProto({ _tag: tag, layer, key: `@mattiacrovero/effect-nextjs/NextRoute/${tag}` }) as any
}

const RouteMethodProto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  middleware(this: Any, middleware: NextMiddleware.TagClassAny) {
    return makeRouteMethod({
      _tag: this._tag,
      key: this.key,
      method: this.method,
      layer: this.layer,
      middlewares: [...this.middlewares, middleware],
      ...(this.paramsSchema !== undefined ? { paramsSchema: this.paramsSchema } as const : {})
    })
  },
  setParamsSchema(this: Any, schema: AnySchema) {
    return makeRouteMethod({
      _tag: this._tag,
      key: this.key,
      method: this.method,
      layer: this.layer,
      middlewares: this.middlewares,
      ...(schema !== undefined ? { paramsSchema: schema } as const : {})
    })
  },
  run(this: Any, build: (ctx: any) => Effect<any, any, any>, onError?: (error: unknown) => unknown) {
    const middlewares = this.middlewares
    const layer = this.layer
    const paramsSchema = this.paramsSchema
    const method = this.method as HttpMethod
    return (request: Request, ctx?: { readonly params?: Promise<Record<string, string>> }) => {
      const program = Effect_.gen(function*() {
        const context = yield* Effect_.context<never>()
        const payload = yield* Effect_.gen(function*() {
          const decodedParams = paramsSchema && ctx?.params !== undefined
            ? yield* (Schema_ as any).decodeUnknown(paramsSchema)(
              yield* Effect_.promise(() => ctx!.params as Promise<Record<string, string>>)
            )
            : ctx?.params
          return { request, params: decodedParams }
        })
        let handlerEffect = build(payload as any) as Effect<any, any, any>
        if (middlewares.length > 0) {
          const options = { _type: "route" as const, method, request, params: ctx?.params }
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

const makeRouteMethod = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, any>,
  const Method extends HttpMethod,
  Middleware extends NextMiddleware.TagClassAny
>(options: {
  readonly _tag: Tag
  readonly key: string
  readonly method: Method
  readonly layer: L
  readonly middlewares: ReadonlyArray<Middleware>
  readonly paramsSchema?: AnySchema
}): NextRouteMethod<Tag, L, Method, Middleware> => {
  function NextRouteMethod() {}
  Object.setPrototypeOf(NextRouteMethod, RouteMethodProto)
  Object.assign(NextRouteMethod, options)
  return NextRouteMethod as any
}

export type HandlerFrom<P extends Any> = P extends Any ? ToHandlerFn<P> : never
export type ExtractProvides<R extends Any> = R extends
  NextRouteMethod<infer _Tag, infer _Layer, any, infer _Middleware, infer _ParamsA>
  ? LayerSuccess<_Layer> | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never
export type ExcludeProvides<Env, R extends Any> = Exclude<Env, ExtractProvides<R>>
export interface Handler<Tag extends string> {
  readonly _: unique symbol
  readonly tag: Tag
  readonly handler: (request: any) => Effect<any, any>
}
export type ToHandler<R extends Any> = R extends NextRouteMethod<infer _Tag, infer _Middleware, any> ? Handler<_Tag>
  : never
export type ToHandlerFn<R extends Any> = (
  request: { readonly request: Request; readonly params: Params<R> }
) => Effect<any, any, ExtractProvides<R>>
export type Params<P extends Any> = P extends
  NextRouteMethod<infer _Tag, infer _Layer, any, infer _Middleware, infer ParamsA> ?
  ParamsA extends undefined ? Promise<Record<string, string>> : ParamsA
  : never
export type MiddlewareErrors<M> = M extends NextMiddleware.TagClassAny ? Schema.Schema.Type<M["failure"]>
  : never
export type HandlerError<H> = H extends (...args: any) => Effect<infer _A, infer _E, any> ? _E
  : never
