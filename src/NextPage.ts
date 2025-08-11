import type { Layer } from "effect"
import type * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
// import type { Scope } from "effect/Scope"
import type { NextMiddleware } from "./index.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mattiacrovero/effect-next/Rpc")

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
  readonly middlewares: ReadonlySet<NextMiddleware.TagClassAnyWithProps>
  readonly layer: Layer.Layer<any, any, any>
}

type LayerSuccess<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

export interface NextPage<
  in out Tag extends string,
  in out L extends Layer.Layer<any, any, any>,
  out Middleware extends NextMiddleware.TagClassAny = never
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlySet<Middleware>
  readonly layer: L

  middleware<M extends NextMiddleware.TagClassAny>(
    // middleware: M
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextPage<Tag, L, Middleware | M>

  // run(handler: (ctx: any) => Effect<any, any, any>): Promise<any>

  run<
    const Tag extends string,
    InnerHandler extends HandlerFrom<NextPage<Tag, L, Middleware>>
  >(
    build: InnerHandler
  ): Promise<any>
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlySet<NextMiddleware.TagClassAny>
  readonly layer: Layer.Layer<any, any, any>
}

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

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  middleware(this: AnyWithProps, middleware: NextMiddleware.TagClassAny) {
    return makeProto({
      _tag: this._tag,
      layer: this.layer,
      middlewares: new Set([...this.middlewares, middleware])
    })
  }
}

const makeProto = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, any>,
  Middleware extends NextMiddleware.TagClassAny
>(options: {
  readonly _tag: Tag
  readonly layer: L
  readonly middlewares: ReadonlySet<Middleware>
}): NextPage<Tag, L, Middleware> => {
  function NextPage() {}
  Object.setPrototypeOf(NextPage, Proto)
  Object.assign(NextPage, options)
  NextPage.key = `@mattiacrovero/effect-next/NextPage/${options._tag}`
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
    middlewares: new Set<never>()
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
 * Represents an implemented rpc.
 *
 * @since 1.0.0
 * @category models
 */
// (moved to NextPage namespace)

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlerFrom<P extends Any> = P extends Any ? ToHandlerFn<P> : never
/**
 * @since 1.0.0
 * @category models
 */
export type ExtractProvides<R extends Any> = R extends NextPage<infer _Tag, infer _Layer, infer _Middleware> ?
  Context_.Tag.Identifier<_Middleware> extends Layer.Layer<infer _ROut, any, any> ? _ROut :
  _Middleware extends {
    readonly provides: Context_.Tag<infer _I, infer _S>
  } ? _I
  : never
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type ExcludeProvides<Env, R extends Any> = Exclude<Env, ExtractProvides<R>>

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
export type ToHandlerFn<R extends Any> = (request: any) => Effect<any, any, ExtractProvides<R>>

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlerContext<P extends Any, Handler> = Handler extends (
  ...args: any
) => Effect<infer _A, infer _E, infer _R> ? ExcludeProvides<_R, P>
  : never
