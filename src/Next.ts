import type { Layer } from "effect"
import type * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import type { Scope } from "effect/Scope"
import type { NextMiddleware } from "./index.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@ujiboo/effect-next/Rpc")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
}
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
  readonly payloadSchema: AnySchema
  readonly successSchema: Schema.Schema.Any
  readonly errorSchema: Schema.Schema.All
  readonly middlewares: ReadonlySet<NextMiddleware.TagClassAnyWithProps>
}

export interface Page<
  in out Tag extends string,
  out Success extends Schema.Schema.Any = typeof Schema.Void,
  out Error extends Schema.Schema.All = typeof Schema.Never,
  out Middleware extends NextMiddleware.TagClassAny = never
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly middlewares: ReadonlySet<Middleware>

  /**
   * Set the schema for the success response of the rpc.
   */
  setSuccess<S extends Schema.Schema.Any>(schema: S): Page<Tag, S, Error, Middleware>

  /**
   * Set the schema for the error response of the rpc.
   */
  setError<E extends Schema.Schema.Any>(schema: E): Page<Tag, Success, E, Middleware>

  /**
   * Add an `RpcMiddleware` to this procedure.
   */
  middleware<M extends NextMiddleware.TagClassAny>(middleware: M): Page<Tag, Success, Error, Middleware | M>

  /**
   * Implement a single handler from the group.
   */
  toLayerHandler<
    const Tag extends string,
    InnerHandler extends HandlerFrom<Page<Tag, Success, Error, Middleware>>,
    EX = never,
    RX = never
  >(
    build: InnerHandler
  ): Layer.Layer<
    Handler<Tag>,
    EX,
    Exclude<RX, Scope> | HandlerContext<Page<Tag, Success, Error, Middleware>, InnerHandler>
  >
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly successSchema: Schema.Schema.Any
  readonly errorSchema: Schema.Schema.All
  readonly middlewares: ReadonlySet<NextMiddleware.TagClassAny>
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
  readonly context: Context<never>
}

/**
 * @since 1.0.0
 * @category models
 */
export type Success<R> = R extends Page<infer _Tag, infer _Success, infer _Error, infer _Middleware> ? _Success["Type"]
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type ErrorSchema<R> = R extends Page<infer _Tag, infer _Success, infer _Error, infer _Middleware>
  ? _Error | _Middleware
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type Error<R> = Schema.Schema.Type<ErrorSchema<R>>

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  setSuccess(this: AnyWithProps, successSchema: Schema.Schema.Any) {
    return makeProto({
      _tag: this._tag,
      successSchema,
      errorSchema: this.errorSchema,
      middlewares: this.middlewares
    })
  },
  setError(this: AnyWithProps, errorSchema: Schema.Schema.All) {
    return makeProto({
      _tag: this._tag,
      successSchema: this.successSchema,
      errorSchema,
      middlewares: this.middlewares
    })
  },
  middleware(this: AnyWithProps, middleware: NextMiddleware.TagClassAny) {
    return makeProto({
      _tag: this._tag,
      successSchema: this.successSchema,
      errorSchema: this.errorSchema,
      middlewares: new Set([...this.middlewares, middleware])
    })
  }
}

const makeProto = <
  const Tag extends string,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All,
  Middleware extends NextMiddleware.TagClassAny
>(options: {
  readonly _tag: Tag
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly middlewares: ReadonlySet<Middleware>
}): Page<Tag, Success, Error, Middleware> => {
  function Page() {}
  Object.setPrototypeOf(Page, Proto)
  Object.assign(Page, options)
  Page.key = `@ujiboo/effect-next/Page/${options._tag}`
  return Page as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  const Tag extends string,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(
  tag: Tag,
  options?: {
    readonly success?: Success
    readonly error?: Error
  }
): Page<Tag, Success, Error> => {
  const successSchema = options?.success ?? Schema.Void
  const errorSchema = options?.error ?? Schema.Never
  return makeProto({
    _tag: tag,
    successSchema,
    errorSchema,
    middlewares: new Set<never>()
  }) as any
}

/**
 * @since 1.0.0
 * @category models
 */
export type Context<R> = R extends Page<infer _Tag, infer _Success, infer _Error, infer _Middleware>
  ? _Success["Context"] | _Error["Context"]
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type Middleware<R> = R extends Page<infer _Tag, infer _Success, infer _Error, infer _Middleware>
  ? Context_.Tag.Identifier<_Middleware>
  : never
/**
 * Represents an implemented rpc.
 *
 * @since 1.0.0
 * @category models
 */
// (moved to Page namespace)

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlerFrom<P extends Any> = P extends Any ? ToHandlerFn<P> : never

/**
 * Represents an implemented rpc.
 *
 * @since 1.0.0
 * @category models
 */
// (moved to Page namespace)

/**
 * @since 1.0.0
 * @category models
 */
export type ExtractProvides<R extends Any> = R extends Page<infer _Tag, infer _Success, infer _Error, infer _Middleware>
  ? _Middleware extends {
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
export type ResultFrom<R extends Any, Context> = R extends Page<
  infer _Tag,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? Effect<_Success["Type"], _Error["Type"], Context>
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type ToHandler<R extends Any> = R extends Page<infer _Tag, infer _Success, infer _Error, infer _Middleware>
  ? Handler<_Tag>
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type ToHandlerFn<Current extends Any, R = any> = (request: any) => ResultFrom<Current, R>

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlersFrom<P extends Any> = {
  readonly [Current in P as Current["_tag"]]: ToHandlerFn<Current>
}

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlerContext<P extends Any, Handler> = Handler extends (
  ...args: any
) => Effect<infer _A, infer _E, infer _R> ? ExcludeProvides<_R, P>
  : never
