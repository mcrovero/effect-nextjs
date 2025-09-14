/**
 * @since 0.5.0
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as Layer_ from "effect/Layer"
import * as Schema from "effect/Schema"
import type { Mutable } from "effect/Types"

/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mcrovero/effect-nextjs/Middleware")

/**
 * Type alias for the unique `TypeId` used to brand middleware tag classes.
 *
 * @since 0.5.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * Internal options passed to middleware implementations.
 *
 * - `props` carries arguments from the outer handler (e.g. request params)
 */
type MiddlewareOptions = {
  props: unknown
}

/**
 * Simple middleware contract.
 *
 * Produces or validates part of the environment (`Provides`), can fail with
 * `E`, and requires environment `R`.
 *
 * @since 0.5.0
 * @category models
 */
export interface NextMiddleware<Provides, E, R = never> {
  (options: MiddlewareOptions): Effect.Effect<Provides, E, R>
}

/**
 * Wrapper middleware contract.
 *
 * Intercepts execution by receiving a `next` effect. It can catch structured
 * errors (`Catches`) from `next` and map them to success. It requires
 * environment `R` and returns any value (often response-like).
 *
 * @since 0.5.0
 * @category models
 */
export interface NextMiddlewareWrap<Provides, Catches, R> {
  (
    options: MiddlewareOptions & { readonly next: Effect.Effect<any, Catches, Provides> }
  ): Effect.Effect<any, never, R>
}

/**
 * Erased middleware function shape used internally for dynamic composition.
 *
 * @since 0.5.0
 * @category models
 */
export interface Any {
  (options: { readonly payload: unknown; readonly next?: Effect.Effect<any, any, any> }): Effect.Effect<any, any, any>
}

/**
 * Strongly-typed tag class representing a middleware capability.
 *
 * The concrete service type depends on whether the tag is a wrapper (`wrap`
 * true) or a regular middleware.
 *
 * @since 0.5.0
 * @category models
 */
export type TagClass<Self, Name extends string, Options, R> = TagClass.Base<
  Self,
  Name,
  Options,
  TagClass.Wrap<Options> extends true
    ? NextMiddlewareWrap<TagClass.Provides<Options>, TagClass.CatchesValue<Options>, R>
    : NextMiddleware<TagClass.Service<Options>, TagClass.FailureService<Options>, R>
>

/**
 * @since 0.5.0
 * @category models
 */
export declare namespace TagClass {
  /**
   * Extracts the identifier type of the provided `Context.Tag`.
   *
   * @since 0.5.0
   * @category models
   */
  export type Provides<Options> = Options extends {
    readonly provides: Context.Tag<any, any>
  } ? Context.Tag.Identifier<Options["provides"]>
    : never

  /**
   * Service value provided by the middleware when `provides` is specified.
   *
   * @since 0.5.0
   * @category models
   */
  export type Service<Options> = Options extends {
    readonly provides: Context.Tag<any, any>
  } ? Context.Tag.Service<Options["provides"]>
    : void

  /**
   * Schema describing failures that the middleware may raise.
   *
   * @since 0.5.0
   * @category models
   */
  export type FailureSchema<Options> = Options extends {
    readonly failure: Schema.Schema.All
  } ? Options["failure"]
    : typeof Schema.Never

  /**
   * Decoded failure value type from `FailureSchema`.
   *
   * @since 0.5.0
   * @category models
   */
  export type Failure<Options> = Options extends {
    readonly failure: Schema.Schema<infer _A, infer _I, infer _R>
  } ? _A
    : never

  /**
   * Context required to decode failures for the schema.
   *
   * @since 0.5.0
   * @category models
   */
  export type FailureContext<Options> = Schema.Schema.Context<FailureSchema<Options>>

  /**
   * Alias of `Failure` to emphasize the value-level failure channel.
   *
   * @since 0.5.0
   * @category models
   */
  export type FailureService<Options> = Failure<Options>

  /**
   * Whether the middleware is a wrapper (receives `next`).
   *
   * @since 0.5.0
   * @category models
   */
  export type Wrap<Options> = Options extends { readonly wrap: true } ? true : false

  /**
   * Schema of errors that a wrapper middleware can catch from `next`.
   *
   * @since 0.5.0
   * @category models
   */
  export type CatchesSchema<Options> = Wrap<Options> extends true
    ? Options extends { readonly catches: Schema.Schema.All } ? Options["catches"] : typeof Schema.Never
    : typeof Schema.Never

  /**
   * Decoded value type of the `catches` schema.
   *
   * @since 0.5.0
   * @category models
   */
  export type CatchesValue<Options> = CatchesSchema<Options> extends Schema.Schema<infer A, any, any> ? A : never

  /**
   * Schema describing additional wrapped return value produced by wrapper
   * middlewares.
   *
   * @since 0.5.0
   * @category models
   */
  export type ReturnsSchema<Options> = Wrap<Options> extends true
    ? Options extends { readonly returns: Schema.Schema.All } ? Options["returns"] : typeof Schema.Never
    : typeof Schema.Never

  /**
   * Base structural shape of a middleware tag class.
   *
   * @since 0.5.0
   * @category models
   */
  export interface Base<Self, Name extends string, Options, Service> extends Context.Tag<Self, Service> {
    new(_: never): Context.TagClassShape<Name, Service>
    readonly [TypeId]: TypeId
    readonly failure: FailureSchema<Options>
    readonly catches: CatchesSchema<Options>
    readonly provides: Options extends { readonly provides: Context.Tag<any, any> } ? Options["provides"] : undefined
    readonly wrap: Wrap<Options>
    readonly returns: ReturnsSchema<Options>
  }
}

/**
 * Erased view of a middleware tag class (no generic parameters).
 *
 * @since 0.5.0
 * @category models
 */
export interface TagClassAny extends Context.Tag<any, any> {
  readonly [TypeId]: TypeId
  readonly provides?: Context.Tag<any, any> | undefined
  readonly failure: Schema.Schema.All
  readonly catches: Schema.Schema.All
  readonly wrap: boolean
  readonly returns: Schema.Schema.All
}

/**
 * Erased tag class variant whose service is a concrete middleware function.
 * Used by the middleware chain during execution.
 *
 * @since 0.5.0
 * @category models
 */
export interface TagClassAnyWithProps
  extends Context.Tag<any, NextMiddleware<any, any, any> | NextMiddlewareWrap<any, any, any>>
{
  readonly [TypeId]: TypeId
  readonly provides?: Context.Tag<any, any> | undefined
  readonly failure: Schema.Schema.All
  readonly catches: Schema.Schema.All
  readonly wrap: boolean
  readonly returns: Schema.Schema.All
}

/**
 * Creates a strongly-typed middleware tag class.
 *
 * Overloaded on `Options.wrap` to produce either a wrapper or a simple
 * middleware. Optional `failure`, `provides`, `catches`, and `returns` schemas
 * configure type-level behavior and runtime metadata.
 *
 * @since 0.5.0
 * @category tags
 */
export const Tag = <Self>(): <
  const Name extends string,
  const Options extends (
    | {
      readonly wrap: true
      readonly failure?: Schema.Schema.All
      readonly provides?: Context.Tag<any, any>
      readonly catches?: Schema.Schema.All
      readonly returns?: Schema.Schema.All
    }
    | {
      readonly wrap?: false
      readonly failure?: Schema.Schema.All
      readonly provides?: Context.Tag<any, any>
      readonly catches?: undefined
    }
  )
>(
  id: Name,
  options?: Options | undefined
) => TagClass<Self, Name, Options, never> =>
(
  id: string,
  options?: any
) => {
  const Err = globalThis.Error as any
  const limit = Err.stackTraceLimit
  Err.stackTraceLimit = 2
  const creationError = new Err()
  Err.stackTraceLimit = limit

  function TagClass() {}
  const TagClass_ = TagClass as any as Mutable<TagClassAny>
  Object.setPrototypeOf(TagClass, Object.getPrototypeOf(Context.GenericTag<Self, any>(id)))
  TagClass.key = id
  Object.defineProperty(TagClass, "stack", {
    get() {
      return creationError.stack
    }
  })
  TagClass_[TypeId] = TypeId
  TagClass_.failure = options?.failure === undefined ? Schema.Never : options.failure
  ;(TagClass_ as any).catches = options && (options as any).wrap === true && (options as any).catches !== undefined
    ? (options as any).catches
    : Schema.Never
  if (options?.provides) {
    TagClass_.provides = options.provides
  }
  TagClass_.wrap = options?.wrap ?? false
  ;(TagClass_ as any).returns = options && (options as any).wrap === true && (options as any).returns !== undefined
    ? (options as any).returns
    : Schema.Never
  return TagClass as any
}

/** Infers the required environment `R` from an implementation function. */
type InferRFromImpl<Impl> = Impl extends (options: any) => Effect.Effect<any, any, infer R> ? R : never

/** Extracts the provided service type from a tag's `provides` property. */
type ProvidedService<M> = M extends { readonly provides: Context.Tag<any, infer S> } ? S : never

/** Decodes the failure value from a tag's `failure` schema. */
type FailureFromTag<M> = M extends { readonly failure: Schema.Schema<infer A, any, any> } ? A : never

/**
 * Builds a `Layer` from a middleware tag and its effectful implementation.
 *
 * The resulting layer registers the implementation under the tag in the
 * environment so that the middleware chain can retrieve and invoke it.
 */
export function layer<
  M extends TagClassAny,
  Impl extends (
    options:
      & MiddlewareOptions
      & (
        M["wrap"] extends true ? { readonly next: Effect.Effect<any, TagClass.CatchesValue<M>, ProvidedService<M>> }
          : unknown
      )
  ) => Effect.Effect<
    M["wrap"] extends true ? any : ProvidedService<M>,
    M["wrap"] extends true ? never : FailureFromTag<M>,
    InferRFromImpl<Impl>
  >
>(
  tag: M,
  impl: Impl
): Layer.Layer<Context.Tag.Identifier<M>, never, Exclude<InferRFromImpl<Impl>, ProvidedService<M>>> {
  return Layer_.effect(tag as any, Effect_.as(Effect_.context<any>() as any, impl as any)) as any
}
