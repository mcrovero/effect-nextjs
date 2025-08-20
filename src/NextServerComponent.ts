import { Cause, Exit, type Layer } from "effect"
import * as Context from "effect/Context"
import type * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type * as NextMiddleware from "./NextMiddleware.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mcrovero/effect-nextjs/ServerComponent")

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
}

type LayerSuccess<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

export interface NextServerComponent<
  in out Tag extends string,
  in out L extends Layer.Layer<any, any, any>,
  out Middleware extends NextMiddleware.TagClassAny = never
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlyArray<Middleware>
  readonly layer: L

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextServerComponent<Tag, L, Middleware | M>

  // props-less variant
  build<Out, E extends CatchesFromMiddleware<Middleware>>(
    handler: () => Effect<Out, E, ExtractProvides<NextServerComponent<Tag, L, Middleware>>>
  ): () => Promise<Out | WrappedReturns<Middleware>>

  // props variant (infers Props from handler parameter)
  build<Props, Out, E extends CatchesFromMiddleware<Middleware>>(
    handler: (props: Props) => Effect<Out, E, ExtractProvides<NextServerComponent<Tag, L, Middleware>>>
  ): (props: Props) => Promise<Out | WrappedReturns<Middleware>>
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAny>
  readonly layer: Layer.Layer<any, any, any>
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

  build(
    this: AnyWithProps,
    handler: (ctx: any) => Effect<any, any, any>
  ) {
    const middlewares = this.middlewares
    const layer = this.layer
    return (props?: any) => {
      const program = Effect_.gen(function*() {
        const context = yield* Effect_.context<never>()
        let handlerEffect = handler(props as any) as Effect<any, any, any>
        if (middlewares.length > 0) {
          const options = { callerKind: "component" as const }
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
}): NextServerComponent<Tag, L, Middleware> => {
  function NextServerComponent() {}
  Object.setPrototypeOf(NextServerComponent, Proto)
  Object.assign(NextServerComponent, options)
  NextServerComponent.key = `@mcrovero/effect-nextjs/NextServerComponent/${options._tag}`
  return NextServerComponent as any
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
): NextServerComponent<Tag, L> => {
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
export type Middleware<R> = R extends NextServerComponent<infer _Tag, infer _Layer, infer _Middleware>
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
export type ExtractProvides<R extends Any> = R extends NextServerComponent<infer _Tag, infer _Layer, infer _Middleware>
  ? LayerSuccess<_Layer> | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type ExcludeProvides<Env, R extends Any> = Exclude<Env, ExtractProvides<R>>

/**
 * Represents an implemented component.
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
export type ToHandler<R extends Any> = R extends NextServerComponent<infer _Tag, infer _Middleware> ? Handler<_Tag>
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type ToHandlerFn<R extends Any> = () => Effect<any, never, ExtractProvides<R>>

// Error typing helpers for build
export type MiddlewareErrors<M> = M extends NextMiddleware.TagClassAny ? Schema.Schema.Type<M["failure"]> : never
export type HandlerError<H> = H extends (...args: any) => Effect<infer _A, infer _E, any> ? _E : never

// Allowed errors are from wrapped middlewares' catches schema (otherwise never)
export type CatchesFromMiddleware<M> = M extends { readonly catches: Schema.Schema<infer A, any, any> } ? A
  : never

// Allow handler error to be E if and only if it's assignable to Allowed
export type AllowedHandler<H, Allowed> = H extends (
  ...args: any
) => Effect<infer _X, infer E, any> ? (E extends Allowed ? H : never)
  : never

// Helper to constrain a server component handler's error to an allowed schema-derived type
export type BuildHandlerWithErrorNoProps<P extends Any, E> = (
  request?: void
) => Effect<any, E, ExtractProvides<P>>

export type BuildHandlerWithErrorWithProps<P extends Any, E, Props> = (
  request: Props
) => Effect<any, E, ExtractProvides<P>>

// Collect the union of "returns" value types from wrapped middlewares' Schema
type InferSchemaOutput<S> = S extends Schema.Schema<infer A, any, any> ? A : never
type WrappedReturns<M> = M extends { readonly wrap: true }
  ? InferSchemaOutput<M extends { readonly returns: infer S } ? S : typeof Schema.Never>
  : never
