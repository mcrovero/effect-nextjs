/**
 * @since 0.5.0
 */
import * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import { executeWithRuntime } from "./internal/executor.js"
import { createMiddlewareChain } from "./internal/middleware-chain.js"
import { getRuntime, setRuntime } from "./internal/runtime-registry.js"
import type { CatchesFromMiddleware, WrappedReturns } from "./internal/shared.js"
import type * as NextMiddleware from "./NextMiddleware.js"

/**
 * @since 0.5.0
 * @category constants
 */
const NextServerComponentSymbolKey = "@mcrovero/effect-nextjs/NextServerComponent"

/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(NextServerComponentSymbolKey)

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
export interface NextServerComponent<
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

  withRuntime(runtime: ManagedRuntime.ManagedRuntime<any, any>): NextServerComponent<Tag, L, Middleware>

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextServerComponent<Tag, L, Middleware | M>

  build<
    I,
    O
  >(
    handler: BuildHandler<NextServerComponent<Tag, L, Middleware>, I, O>
  ): (
    args: I
  ) => Promise<
    ReturnType<BuildHandler<NextServerComponent<Tag, L, Middleware>, I, O>> extends Effect<infer _A, any, any> ?
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
  withRuntime(this: AnyWithProps, runtime: ManagedRuntime.ManagedRuntime<any, any>) {
    return makeProto({
      _tag: this._tag,
      runtime,
      middlewares: this.middlewares
    })
  },
  middleware(this: AnyWithProps, middleware: NextMiddleware.TagClassAny) {
    return makeProto({
      _tag: this._tag,
      runtime: this.runtime,
      middlewares: [...this.middlewares, middleware]
    })
  },

  build<
    I,
    O
  >(
    this: AnyWithProps,
    handler: (
      payload: I
    ) => Effect<O, any, any>
  ) {
    const runtime = this.runtime

    return async (props: I) => {
      const middlewares = this.middlewares

      const program = Effect_.gen(function*() {
        const context = yield* Effect_.context<never>()

        let handlerEffect = handler(props)

        if (middlewares.length > 0) {
          const options = {
            callerKind: "component" as const
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
      const actualRuntime = getRuntime(`${NextServerComponentSymbolKey}/${this._tag}`, runtime)

      // Workaround to handle redirect errors
      return executeWithRuntime(actualRuntime, program as Effect<any, any, never>)
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
}): NextServerComponent<Tag, L, Middleware> => {
  function NextServerComponent() {}
  Object.setPrototypeOf(NextServerComponent, Proto)
  Object.assign(NextServerComponent, options)
  NextServerComponent.key = `${NextServerComponentSymbolKey}/${options._tag}`
  return NextServerComponent as any
}

/**
 * @since 0.5.0
 * @category constructors
 */
export const make = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, never>
>(tag: Tag, layer: L): NextServerComponent<Tag, L> => {
  const runtime = ManagedRuntime.make(layer)

  // Register the runtime in the global registry for development mode (HMR support)
  setRuntime(`${NextServerComponentSymbolKey}/${tag}`, runtime)

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
type ExtractProvides<R extends Any> = R extends NextServerComponent<
  infer _Tag,
  infer _Layer,
  infer _Middleware
> ?
    | LayerSuccess<_Layer>
    | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

type BuildHandler<P extends Any, I, O> = P extends NextServerComponent<infer _Tag, infer _Layer, infer _Middleware> ? (
    args: I
  ) => Effect<O, CatchesFromMiddleware<_Middleware>, ExtractProvides<P>> :
  never
