/**
 * @since 0.5.0
 */
import { Effect } from "effect"
import * as Context_ from "effect/Context"
import type * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import { executeWithRuntime } from "./internal/executor.js"
import { createMiddlewareChain } from "./internal/middleware-chain.js"
import { getRuntime, setRuntime } from "./internal/runtime-registry.js"
import type * as NextMiddleware from "./NextMiddleware.js"

/**
 * @since 0.5.0
 * @category constants
 */
const NextSymbolKey = "@mcrovero/effect-nextjs/Next"

/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(NextSymbolKey)

/**
 * Type alias for the unique `TypeId` symbol used to brand `Next`.
 *
 * @since 0.5.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * Minimal common surface shared by all `Next` constructors at runtime.
 *
 * This interface captures the brand, tag and unique key stored on the
 * constructor function value.
 *
 * @since 0.5.0
 * @category models
 */
export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
}

/**
 * Internal shape for `Next` constructors carrying configured middlewares and
 * an optional managed runtime.
 *
 * @since 0.5.0
 * @category models
 */
export interface AnyWithProps {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAnyWithProps>
  readonly runtime?: ManagedRuntime.ManagedRuntime<any, any>
}

/**
 * Extracts the provided environment from a `Layer`.
 */
type LayerSuccess<L> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

/**
 * Strongly-typed constructor for building Next.js handlers with Effect.
 *
 * - `Tag` is a string identifier for this handler family.
 * - `L` is an optional `Layer` to provision the Effect environment.
 * - `Middleware` is the union of middleware tags attached to the instance.
 *
 * Instances are constructor functions enriched with metadata and helper
 * methods, notably `middleware` for composition and `build` to produce an
 * async function consumable by Next.js.
 *
 * @since 0.5.0
 * @category models
 */
export interface Next<
  in out Tag extends string,
  out L extends Layer.Layer<any, any, any> | undefined,
  out Middleware extends NextMiddleware.TagClassAny = never
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlyArray<Middleware>
  readonly runtime?: ManagedRuntime.ManagedRuntime<any, any>
  readonly paramsSchema?: AnySchema
  readonly searchParamsSchema?: AnySchema

  /**
   * Adds a middleware tag to this handler. The middleware must be satisfied by
   * the environment provided by `L`.
   */
  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): Next<Tag, L, Middleware | M>

  /**
   * Finalizes the handler by supplying an Effect-based implementation and
   * returns an async function compatible with Next.js route APIs.
   */
  build<
    A extends Array<any>,
    O
  >(
    handler: BuildHandler<Next<Tag, L, Middleware>, A, O>
  ): (
    ...args: A
  ) => Promise<
    ReturnType<BuildHandler<Next<Tag, L, Middleware>, A, O>> extends Effect.Effect<infer _A, any, any> ?
      _A | WrappedReturns<Middleware> :
      never
  >
}

/**
 * Prototype used to back `Next` constructor instances.
 *
 * @since 0.5.0
 * @category internal
 * @internal
 */
const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  /**
   * Adds a middleware tag to this handler instance.
   */
  middleware(this: AnyWithProps, middleware: NextMiddleware.TagClassAny) {
    if (this.runtime) {
      return makeProto({
        _tag: this._tag,
        runtime: this.runtime,
        middlewares: [...this.middlewares, middleware]
      } as any)
    }
    return makeProto({
      _tag: this._tag,
      middlewares: [...this.middlewares, middleware]
    } as any)
  },

  /**
   * Binds an Effectful handler and produces an async function suitable for
   * Next.js. It composes configured middlewares and executes within the
   * associated `ManagedRuntime` when present (supporting HMR in dev).
   */
  build<
    A extends Array<any>,
    O
  >(
    this: AnyWithProps,
    handler: (
      ...args: A
    ) => Effect.Effect<O, any, any>
  ) {
    const runtime = this.runtime
    return async (...args: A) => {
      const middlewares = this.middlewares

      const program = Effect.gen(function*() {
        const context = yield* Effect.context<never>()

        let handlerEffect = handler(...args)

        if (middlewares.length > 0) {
          const tags = middlewares
          handlerEffect = createMiddlewareChain(
            tags,
            (tag) => Context_.unsafeGet(context, tag),
            handlerEffect,
            { props: args }
          )
        }
        return yield* handlerEffect
      })
      /**
       * In development we use global registry to get the runtime
       * to support hot-reloading.
       */
      if (runtime) {
        const actualRuntime = getRuntime(`${NextSymbolKey}/${this._tag}`, runtime)
        return executeWithRuntime(actualRuntime, program as Effect.Effect<any, any, never>)
      }
      return executeWithRuntime(undefined, program as Effect.Effect<any, any, never>)
    }
  }
}

const makeProto = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, any> | undefined,
  Middleware extends NextMiddleware.TagClassAny
>(options: {
  readonly _tag: Tag
  readonly runtime?: ManagedRuntime.ManagedRuntime<any, any>
  readonly middlewares: ReadonlyArray<Middleware>
  readonly paramsSchema?: AnySchema
  readonly searchParamsSchema?: AnySchema
}): Next<Tag, L, Middleware> => {
  /**
   * @internal Internal constructor function used as the value of a `Next`
   * instance. The function itself is never called; it exists to carry the
   * prototype and static props.
   */
  function Next() {}
  Object.setPrototypeOf(Next, Proto)
  Object.assign(Next, options)
  Next.key = `${NextSymbolKey}/${options._tag}`
  return Next as any
}

/**
 * Creates a `Next` handler constructor without providing a `Layer`.
 *
 * @since 0.5.0
 * @category constructors
 */
export function make<const Tag extends string>(tag: Tag): Next<Tag, undefined>
export function make<
  const Tag extends string,
  const L extends Layer.Layer<any, any, never>
>(
  tag: Tag,
  layer: L
): Next<Tag, L>
export function make(tag: string, layer?: Layer.Layer<any, any, never>): Next<any, any> {
  if (layer) {
    const runtime = ManagedRuntime.make(layer)
    setRuntime(`${NextSymbolKey}/${tag}`, runtime)
    return makeProto({
      _tag: tag as any,
      runtime,
      middlewares: [] as Array<never>
    })
  }
  return makeProto({
    _tag: tag as any,
    middlewares: [] as Array<never>
  })
}

/**
 * Computes the environment required by a `Next` handler: the environment
 * provided by its `Layer` plus any environments declared by middleware tags.
 */
type ExtractProvides<R extends Any> = R extends Next<
  infer _Tag,
  infer _Layer,
  infer _Middleware
> ?
    | LayerSuccess<_Layer>
    | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

/**
 * Signature of the effectful handler accepted by `build`.
 *
 * - `A` are the runtime arguments of the produced async function
 * - `O` is the success value of the effect
 * - The error channel is constrained by the union of middleware "catches"
 * - The required environment is computed from the `Next` instance
 */
type BuildHandler<P extends Any, A extends Array<any>, O> = P extends
  Next<infer _Tag, infer _Layer, infer _Middleware> ? (
    ...args: A
  ) => Effect.Effect<O, CatchesFromMiddleware<_Middleware>, ExtractProvides<P>> :
  never

/**
 * Computes the wrapped return type produced by middleware implementing the
 * `wrap` protocol. When no wrapper is present, yields `never`.
 */
type WrappedReturns<M> = M extends { readonly wrap: true }
  ? Schema.Schema.Type<M extends { readonly returns: infer S } ? S : typeof Schema.Never>
  : never

/** Extracts the union of error types that middleware can catch. */
type CatchesFromMiddleware<M> = M extends { readonly catches: Schema.Schema<infer A, any, any> } ? A : never

/**
 * Minimal structural view of a `Schema` used here to avoid pulling concrete
 * schema types into the public surface area.
 *
 * @since 0.5.0
 * @category models
 */
interface AnySchema extends Pipeable {
  readonly [Schema.TypeId]: any
  readonly Type: any
  readonly Encoded: any
  readonly Context: any
  readonly make?: (params: any, ...rest: ReadonlyArray<any>) => any
  readonly ast: AST.AST
}
