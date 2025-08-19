import { Cause, Exit, type Layer } from "effect"
import * as Context from "effect/Context"
import type * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type { ParseError } from "effect/ParseResult"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Schema from "effect/Schema"
import type * as NextMiddleware from "./NextMiddleware.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mcrovero/effect-nextjs/Action")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

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
  readonly inputSchema?: Schema.Schema.All
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
  readonly middlewares: ReadonlyArray<Middleware>
  readonly layer: L
  readonly inputSchema?: Schema.Schema.All

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextAction<Tag, L, Middleware | M, InputA>

  setInputSchema<S extends Schema.Schema.All>(schema: S): NextAction<Tag, L, Middleware, S>

  build<
    E extends CatchesFromMiddleware<Middleware>,
    H extends
      | BuildHandlerWithErrorStrict<NextAction<Tag, L, Middleware, InputA>, E>
      | BuildHandlerWithErrorLoose<NextAction<Tag, L, Middleware, InputA>>,
    I extends H extends BuildHandlerWithErrorStrict<NextAction<Tag, L, Middleware, InputA>, E>
      ? Input<NextAction<Tag, L, Middleware, InputA>> :
      never,
    O extends H extends BuildHandlerWithErrorStrict<NextAction<Tag, L, Middleware, InputA>, E> ?
      ReturnType<H> extends Promise<Effect<infer _A, any, any>> ? _A | WrappedReturns<Middleware> : never :
      never,
    R extends H extends BuildHandlerWithErrorStrict<NextAction<Tag, L, Middleware, InputA>, E> ?
      (input: I) => Promise<O> :
      never,
    F extends H extends BuildHandlerWithErrorStrict<NextAction<Tag, L, Middleware, InputA>, E> ?
      [] | [onError: (error: ReturnType<H>) => Effect<any, never, any>] :
      [onError: (error: ReturnType<H>) => Effect<any, never, any>]
  >(
    handler: H,
    ...onError: F
  ): R
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly layer: Layer.Layer<any, any, any>
  readonly inputSchema?: Schema.Schema.All
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
      middlewares: [...this.middlewares, middleware],
      ...(this.inputSchema !== undefined ? { inputSchema: this.inputSchema } as const : {})
    })
  },
  setInputSchema(this: AnyWithProps, schema: Schema.Schema.All) {
    const options = {
      _tag: this._tag,
      layer: this.layer,
      middlewares: this.middlewares,
      ...(schema !== undefined ? { inputSchema: schema } as const : {})
    }
    return makeProto(options)
  },

  build(
    this: AnyWithProps,
    handler: (ctx: any) => Promise<Effect<any, any, any>>,
    onError?: (error: Effect<any, any, any>) => Effect<any, never, any>
  ) {
    const middlewares = this.middlewares
    const layer = this.layer
    const inputSchema = this.inputSchema
    return async (inputArg: unknown) => {
      const program = Effect_.gen(function*() {
        const context = yield* Effect_.context<never>()
        const rawInput = inputArg !== undefined ? inputArg : undefined
        const input = inputSchema
          ? Schema.decodeUnknown(inputSchema as any)(rawInput)
          : rawInput
        const payload = { input }
        let handlerEffect = yield* Effect_.promise(() => handler(payload as any))
        if (onError) {
          handlerEffect = onError(handlerEffect)
        }
        if (middlewares.length > 0) {
          const options = { callerKind: "action" as const, input: (payload as any).input }
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
            return tag.provides !== undefined
              ? Effect_.provideServiceEffect(tail, tag.provides as any, middleware(options))
              : Effect_.zipRight(middleware(options), tail)
          }
          handlerEffect = buildChain(0)
        }
        return yield* handlerEffect
      }).pipe(Effect_.provide(layer))

      /**
       * Workaround to handle redirect errors
       */
      return Effect_.runPromiseExit(program as Effect<any, any, never>).then((result) => {
        if (Exit.isFailure(result)) {
          const mappedError = Cause.match<any, any>(result.cause, {
            onEmpty: () => new Error("empty"),
            onFail: (error) => error,
            onDie: (defect) => defect,
            onInterrupt: (fiberId) => new Error(`Interrupted`, { cause: fiberId }),
            onSequential: (left, right) => new Error(`Sequential (left: ${left}) (right: ${right})`),
            onParallel: (left, right) => new Error(`Parallel (left: ${left}) (right: ${right})`)
          })
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
  readonly inputSchema?: Schema.Schema.All
}): NextAction<Tag, L, Middleware> => {
  function NextAction() {}
  Object.setPrototypeOf(NextAction, Proto)
  Object.assign(NextAction, options)
  NextAction.key = `@mcrovero/effect-nextjs/NextAction/${options._tag}`
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
    middlewares: [] as Array<never>
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
 * Represents an implemented action.
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
export type ToHandlerFn<R extends Any> = (
  request: {
    readonly input: HandlerInputEffect<R>
  }
) => Promise<Effect<any, never, ExtractProvides<R>>>

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlerContext<P extends Any, Handler> = Handler extends (
  ...args: any
) => Effect<infer _A, infer _E, infer _R> ? ExcludeProvides<_R, P>
  : never

export type Input<P extends Any> = P extends NextAction<infer _Tag, infer _Layer, infer _Middleware, infer InputA> ?
  InputA extends Schema.Schema<infer _type, infer encoded, infer _c> ? encoded : unknown
  : never

export type HandlerInputEffect<P extends Any> = P extends
  NextAction<infer _Tag, infer _Layer, infer _Middleware, infer InputA> ?
  (InputA extends Schema.Schema<infer type, infer _encoded, infer _c> ? Effect<type, ParseError, never> : unknown)
  : never

// Error typing helpers for build
type InferSchemaType<S> = S extends Schema.Schema<infer A, any, any> ? A : never
export type MiddlewareErrors<M> = M extends NextMiddleware.TagClassAny ? InferSchemaType<M["failure"]>
  : never

export type HandlerError<H> = H extends (
  ...args: any
) => Effect<infer _A, infer _E, any> ? _E :
  never

// Allowed errors are from wrapped middlewares' catches schema (otherwise never)
export type CatchesFromMiddleware<M> = M extends { readonly catches: Schema.Schema<infer A, any, any> } ? A
  : never

// Allow handler error to be E if and only if it's assignable to Allowed
export type AllowedHandler<H, Allowed> = H extends (
  ...args: any
) => Promise<Effect<infer _X, infer E, any>> ? (E extends Allowed | ParseError ? H : never)
  : never

// Helper to constrain an action handler's error to an allowed schema-derived type
export type BuildHandlerWithErrorStrict<P extends Any, E> = (
  request: {
    readonly input: HandlerInputEffect<P>
  }
) => Promise<Effect<any, E, ExtractProvides<P>>>

// Helper to constrain an action handler's error to an allowed schema-derived type
export type BuildHandlerWithErrorLoose<P extends Any> = (
  request: {
    readonly input: HandlerInputEffect<P>
  }
) => Promise<Effect<unknown, unknown, ExtractProvides<P>>>

export type HandlerErrors<H> = H extends (
  ...args: any
) => Promise<Effect<infer _A, infer E, any>> ? E :
  never

// Collect the union of "returns" value types from wrapped middlewares' Schema
type InferSchemaOutput<S> = S extends Schema.Schema<infer A, any, any> ? A : never
type WrappedReturns<M> = M extends { readonly wrap: true }
  ? InferSchemaOutput<M extends { readonly returns: infer S } ? S : typeof Schema.Never>
  : never
