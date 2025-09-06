/**
 * @since 0.5.0
 */
import { Effect, Schema } from "effect"
import * as Context_ from "effect/Context"
import type * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import { executeWithRuntime } from "./internal/executor.js"
import { createMiddlewareChain } from "./internal/middleware-chain.js"
import { getRuntime, setRuntime } from "./internal/runtime-registry.js"
import type { AnySchema, CatchesFromMiddleware, WrappedReturns } from "./internal/shared.js"
import type * as NextMiddleware from "./NextMiddleware.js"

type NextBaseParams = { params: Promise<Record<string, string | Array<string> | undefined>> }
type NextBaseSearchParams = { searchParams: Promise<Record<string, string | Array<string> | undefined>> }

/**
 * @since 0.5.0
 * @category decode
 */
export const decodeParams = <T, P extends NextBaseParams>(
  schema: Schema.Schema<T, any, any>
) =>
(props: P) =>
  Effect.gen(function*() {
    const params = yield* Effect.promise(() => props.params)
    return yield* Schema.decodeUnknown(schema)(params)
  })

/**
 * @since 0.5.0
 * @category decode
 */
export const decodeSearchParams =
  <T, P extends NextBaseSearchParams>(schema: Schema.Schema<T, any, any>) => (props: P) =>
    Effect.gen(function*() {
      const searchParams = yield* Effect.promise(() => props.searchParams)
      return yield* Schema.decodeUnknown(schema)(searchParams)
    })

/**
 * @since 0.5.0
 * @category constants
 */
const NextSymbolKey = "@mcrovero/effect-nextjs/Next"

/**
 * @since 0.5.0
 * @category models
 */
export interface NextBaseProps {
  readonly params: Promise<Record<string, string | Array<string> | undefined>>
  readonly searchParams: Promise<Record<string, string | Array<string> | undefined>>
}

/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(NextSymbolKey)

/**
 * @since 0.5.0
 * @category type ids
 */
export type TypeId = typeof TypeId

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
}

type LayerSuccess<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

/**
 * @since 0.5.0
 * @category models
 */
export interface Next<
  in out Tag extends string,
  out L extends Layer.Layer<any, any, any>,
  out Middleware extends NextMiddleware.TagClassAny = never
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly middlewares: ReadonlyArray<Middleware>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly paramsSchema?: AnySchema
  readonly searchParamsSchema?: AnySchema

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): Next<Tag, L, Middleware | M>

  build<
    I,
    O
  >(
    handler: BuildHandler<Next<Tag, L, Middleware>, I, O>
  ): (
    args: I
  ) => Promise<
    ReturnType<BuildHandler<Next<Tag, L, Middleware>, I, O>> extends Effect.Effect<infer _A, any, any> ?
      _A | WrappedReturns<Middleware> :
      never
  >
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
  middleware(this: AnyWithProps, middleware: NextMiddleware.TagClassAny) {
    return makeProto({
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: [...this.middlewares, middleware]
    })
  },

  build<
    I extends NextBaseProps,
    O
  >(
    this: AnyWithProps,
    handler: (
      payload: I
    ) => Effect.Effect<O, any, any>
  ) {
    const runtime = this.runtime
    return async (props: I) => {
      const middlewares = this.middlewares

      const program = Effect.gen(function*() {
        const context = yield* Effect.context<never>()

        let handlerEffect = handler(props)

        if (middlewares.length > 0) {
          const options = {
            callerKind: "page" as const,
            params: props.params,
            searchParams: props.searchParams
          }
          const tags = middlewares
          handlerEffect = createMiddlewareChain(
            tags,
            (tag) => Context_.unsafeGet(context, tag),
            handlerEffect,
            options
          )
        }
        return yield* handlerEffect
      })
      /**
       * In development we use global registry to get the runtime
       * to support hot-reloading.
       */
      const actualRuntime = getRuntime(`${NextSymbolKey}/${this._tag}`, runtime)

      // Workaround to handle redirect errors
      return executeWithRuntime(actualRuntime, program as Effect.Effect<any, any, never>)
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
}): Next<Tag, L, Middleware> => {
  function Next() {}
  Object.setPrototypeOf(Next, Proto)
  Object.assign(Next, options)
  Next.key = `${NextSymbolKey}/${options._tag}`
  return Next as any
}

/**
 * @since 0.5.0
 * @category constructors
 */
export const make = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, never>
>(tag: Tag, layer: L): Next<Tag, L> => {
  const runtime = ManagedRuntime.make(layer)

  // Register the runtime in the global registry for development mode (HMR support)
  setRuntime(`${NextSymbolKey}/${tag}`, runtime)

  return makeProto({
    _tag: tag,
    runtime,
    middlewares: [] as Array<never>
  })
}

type ExtractProvides<R extends Any> = R extends Next<
  infer _Tag,
  infer _Layer,
  infer _Middleware
> ?
    | LayerSuccess<_Layer>
    | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

type BuildHandler<P extends Any, I, O> = P extends Next<infer _Tag, infer _Layer, infer _Middleware> ? (
    args: I
  ) => Effect.Effect<O, CatchesFromMiddleware<_Middleware>, ExtractProvides<P>> :
  never
