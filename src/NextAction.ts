/**
 * @since 0.5.0
 * @deprecated Use `Next.make(tag, layer).build(handler)` for server actions. This API will be removed in a future release.
 */
import type * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import { internalBuild, NextActionSymbolKey } from "./internal/next-action.js"
import { setRuntime } from "./internal/runtime-registry.js"
import type { AnySchema, CatchesFromMiddleware, WrappedReturns } from "./internal/shared.js"
import { captureDefinitionSite } from "./internal/stacktrace.js"
import type * as NextMiddleware from "./NextMiddleware.js"

/**
 * @since 0.5.0
 * @category type ids
 * @deprecated Use `Next.make(tag, layer).build(handler)` for server actions. This API will be removed in a future release.
 */
export const TypeId: unique symbol = Symbol.for(NextActionSymbolKey)

/**
 * @since 0.5.0
 * @category type ids
 * @deprecated Use `Next.make(tag, layer).build(handler)` for server actions. This API will be removed in a future release.
 */
export type TypeId = typeof TypeId

/**
 * @since 0.5.0
 * @category models
 * @deprecated Use `Next.make(tag, layer).build(handler)` for server actions. This API will be removed in a future release.
 */
export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
}

/**
 * @since 0.5.0
 * @category models
 * @deprecated Use `Next.make(tag, layer).build(handler)` for server actions. This API will be removed in a future release.
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
 * @deprecated Use `Next.make(tag, layer).build(handler)` for server actions. This API will be removed in a future release.
 */
export interface NextAction<
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
  readonly inputSchema?: AnySchema

  middleware<M extends NextMiddleware.TagClassAny>(
    middleware: Context_.Tag.Identifier<M> extends LayerSuccess<L> ? M : never
  ): NextAction<Tag, L, Middleware | M>

  /**
   * @deprecated Use `Next.make(tag, layer).build(handler)` and export an async function that calls the built handler.
   * Build an action handler without tracing.
   *
   * This variant does not create a tracing span nor capture call/definition
   * sites. If you want tracing behavior similar to `Effect.fn` (named span
   * with captured call/definition sites), use {@link runFn} instead.
   */
  run<
    O
  >(
    handler: BuildHandler<NextAction<Tag, L, Middleware>, O>
  ): BuildHandler<NextAction<Tag, L, Middleware>, O> extends Effect<infer _A, any, any> ?
    Promise<_A | WrappedReturns<Middleware>> :
    never

  /**
   * @deprecated Use `Next.make(tag, layer).build(handler)` with `Effect.fn` for tracing.
   * Build a traced action handler (mimics `Effect.fn`).
   *
   * This variant creates a named tracing span and captures both the
   * definition site and the call site, similar to `Effect.fn`.
   * The provided `spanName` will be used to label the span.
   */
  runFn<
    O
  >(
    spanName: string,
    handler: BuildHandler<NextAction<Tag, L, Middleware>, O>
  ): BuildHandler<NextAction<Tag, L, Middleware>, O> extends Effect<infer _A, any, any> ?
    Promise<_A | WrappedReturns<Middleware>> :
    never
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

  /**
   * @deprecated Use `Next.make(tag, layer).build(handler)` and export an async function that calls the built handler.
   * Build an action handler without tracing.
   *
   * This does not create a tracing span nor capture call/definition sites.
   * Use {@link runFn} for `Effect.fn`-like tracing.
   */
  run<
    O
  >(
    this: AnyWithProps,
    effect: Effect<O, any, any>
  ) {
    return internalBuild(this, effect, { traced: false })
  },

  /**
   * @deprecated Use `Next.make(tag, layer).build(handler)` with `Effect.fn` for tracing.
   * Build a traced action handler (mimics `Effect.fn`).
   *
   * Creates a named tracing span and captures call/definition sites.
   * The `spanName` labels the span for observability.
   */
  runFn<
    O
  >(
    this: AnyWithProps,
    spanName: string,
    effect: Effect<O, any, any>
  ) {
    const errorDef = captureDefinitionSite()
    return internalBuild(this, effect, { traced: true, spanName, errorDef })
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
  readonly inputSchema?: AnySchema
}): NextAction<Tag, L, Middleware> => {
  function NextAction() {}
  Object.setPrototypeOf(NextAction, Proto)
  Object.assign(NextAction, options)
  NextAction.key = `${NextActionSymbolKey}/${options._tag}`
  return NextAction as any
}

/**
 * @since 0.5.0
 * @category constructors
 * @deprecated Use `Next.make(tag, layer)` and `.build(handler)` for server actions.
 */
export const make = <
  const Tag extends string,
  const L extends Layer.Layer<any, any, never>
>(tag: Tag, layer: L): NextAction<Tag, L> => {
  const runtime = ManagedRuntime.make(layer)

  // Register the runtime in the global registry for development mode (HMR support)
  setRuntime(`${NextActionSymbolKey}/${tag}`, runtime)

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[DEPRECATED] NextAction is deprecated and will be removed in a future release. Use Next.make(tag, layer).build(handler) for server actions."
    )
  }
  return makeProto({
    _tag: tag,
    runtime,
    middlewares: [] as Array<never>
  })
}

type ExtractProvides<R extends Any> = R extends NextAction<
  infer _Tag,
  infer _Layer,
  infer _Middleware
> ?
    | LayerSuccess<_Layer>
    | (_Middleware extends { readonly provides: Context_.Tag<infer _I, any> } ? _I : never)
  : never

type BuildHandler<P extends Any, O> = P extends NextAction<infer _Tag, infer _Layer, infer _Middleware> ?
  Effect<O, CatchesFromMiddleware<_Middleware>, ExtractProvides<P>> :
  never
