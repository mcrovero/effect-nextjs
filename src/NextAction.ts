import type { Layer } from "effect"
import * as Context from "effect/Context"
import type * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import * as Schema_ from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import type { NextMiddleware } from "./index.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mattiacrovero/effect-next/Action")

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
  readonly inputSchema?: AnySchema
}

type LayerSuccess<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

export interface NextAction<
  in out Tag extends string,
  in out L extends Layer.Layer<any, any, any>,
  out Middleware extends NextMiddleware.TagClassAny = never,
  in InputA = undefined
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlySet<Middleware>
  readonly layer: L
  readonly inputSchema?: AnySchema

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextAction<Tag, L, Middleware | M, InputA>

  setInputSchema<S extends AnySchema>(schema: S): NextAction<Tag, L, Middleware, S["Type"]>

  run<
    InnerHandler extends HandlerFrom<NextAction<Tag, L, Middleware, InputA>>
  >(
    build: InnerHandler
  ): (
    input?: Input<NextAction<Tag, L, Middleware, InputA>>
  ) => Effect<
    ReturnType<InnerHandler> extends Effect<infer _A, any, any> ? _A : never,
    any,
    never
  >
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlySet<NextMiddleware.TagClassAny>
  readonly layer: Layer.Layer<any, any, any>
  readonly inputSchema?: AnySchema
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
      middlewares: new Set([...this.middlewares, middleware]),
      ...(this.inputSchema !== undefined ? { inputSchema: this.inputSchema } as const : {})
    })
  },
  setInputSchema(this: AnyWithProps, schema: AnySchema) {
    const options = {
      _tag: this._tag,
      layer: this.layer,
      middlewares: this.middlewares,
      ...(schema !== undefined ? { inputSchema: schema } as const : {})
    }
    return makeProto(options)
  },

  run(
    this: AnyWithProps,
    build: (ctx: any) => Effect<any, any, any>
  ) {
    const middlewares = this.middlewares
    const layer = this.layer
    const inputSchema = this.inputSchema
    return (inputArg?: unknown) => {
      const program = Effect_.gen(function*() {
        const context = yield* Effect_.context<never>()
        const payload = yield* Effect_.gen(function*() {
          const rawInput = inputArg !== undefined ? inputArg : undefined
          const decodedInput = inputSchema && rawInput !== undefined
            ? yield* (Schema_ as any).decodeUnknown(inputSchema)(rawInput)
            : rawInput
          return { input: decodedInput }
        })
        let handlerEffect = build(payload as any) as Effect<any, any, any>
        if (middlewares.size > 0) {
          const options = { _type: "action" as const }
          for (const tag of middlewares) {
            if (tag.wrap) {
              const middleware = Context.unsafeGet(context, tag) as any
              handlerEffect = middleware({ ...options, next: handlerEffect }) as any
            } else if (tag.optional) {
              const middleware = Context.unsafeGet(context, tag) as any
              const previous = handlerEffect
              handlerEffect = Effect_.matchEffect(middleware(options), {
                onFailure: () => previous,
                onSuccess: tag.provides !== undefined
                  ? (value) => Effect_.provideService(previous, tag.provides as any, value)
                  : () => previous
              })
            } else {
              const middleware = Context.unsafeGet(context, tag) as any
              handlerEffect = tag.provides !== undefined
                ? Effect_.provideServiceEffect(handlerEffect, tag.provides as any, middleware(options))
                : Effect_.zipRight(middleware(options), handlerEffect)
            }
          }
        }
        return yield* handlerEffect
      }).pipe(Effect_.provide(layer))

      return program as Effect<any, any, never>
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
  readonly middlewares: ReadonlySet<Middleware>
  readonly inputSchema?: AnySchema
}): NextAction<Tag, L, Middleware> => {
  function NextAction() {}
  Object.setPrototypeOf(NextAction, Proto)
  Object.assign(NextAction, options)
  NextAction.key = `@mattiacrovero/effect-next/NextAction/${options._tag}`
  return NextAction as any
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
): NextAction<Tag, L> => {
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
export type Middleware<R> = R extends NextAction<infer _Tag, infer _Layer, infer _Middleware>
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
  NextAction<infer _Tag, infer _Layer, infer _Middleware, infer _InputA>
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
export type ToHandler<R extends Any> = R extends NextAction<infer _Tag, infer _Middleware> ? Handler<_Tag>
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type ToHandlerFn<R extends Any> = (request: {
  readonly input: Input<R>
}) => Effect<any, any, ExtractProvides<R>>

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlerContext<P extends Any, Handler> = Handler extends (
  ...args: any
) => Effect<infer _A, infer _E, infer _R> ? ExcludeProvides<_R, P>
  : never

export type Input<P extends Any> = P extends NextAction<infer _Tag, infer _Layer, infer _Middleware, infer InputA> ?
  InputA extends undefined ? unknown : InputA
  : never
