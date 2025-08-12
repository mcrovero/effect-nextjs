/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as Layer_ from "effect/Layer"
import * as Schema from "effect/Schema"
import type { Mutable } from "effect/Types"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mattiacrovero/effect-next/Middleware")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

type MiddlewareOptions = {
  readonly _type: "page"
  readonly params: Promise<Record<string, string>>
  readonly searchParams?: Promise<Record<string, string>>
} | {
  readonly _type: "layout"
  readonly params: Promise<Record<string, string>>
  readonly children: unknown
} | {
  readonly _type: "action"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface NextMiddleware<Provides, E, R> {
  (options: MiddlewareOptions): Effect.Effect<Provides, E, R>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface SuccessValue {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Any {
  (options: { readonly payload: unknown; readonly next?: Effect.Effect<any, any, any> }): Effect.Effect<any, any>
}

/**
 * @since 1.0.0
 * @category models
 */
export type TagClass<Self, Name extends string, Options, R> = TagClass.Base<
  Self,
  Name,
  Options,
  NextMiddleware<TagClass.Service<Options>, TagClass.FailureService<Options>, R>
>

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace TagClass {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Provides<Options> = Options extends {
    readonly provides: Context.Tag<any, any>
    readonly optional?: false
  } ? Context.Tag.Identifier<Options["provides"]>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Service<Options> = Options extends {
    readonly provides: Context.Tag<any, any>
  } ? Context.Tag.Service<Options["provides"]>
    : void

  /**
   * @since 1.0.0
   * @category models
   */
  export type FailureSchema<Options> = Options extends {
    readonly failure: Schema.Schema.All
    readonly optional?: false
  } ? Options["failure"]
    : typeof Schema.Never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Failure<Options> = Options extends {
    readonly failure: Schema.Schema<infer _A, infer _I, infer _R>
    readonly optional?: false
  } ? _A
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type FailureContext<Options> = Schema.Schema.Context<FailureSchema<Options>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type FailureService<Options> = Optional<Options> extends true ? unknown : Failure<Options>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Optional<Options> = Options extends { readonly optional: true } ? true : false

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Base<Self, Name extends string, Options, Service> extends Context.Tag<Self, Service> {
    new(_: never): Context.TagClassShape<Name, Service>
    readonly [TypeId]: TypeId
    readonly optional: Optional<Options>
    readonly failure: FailureSchema<Options>
    readonly provides: Options extends { readonly provides: Context.Tag<any, any> } ? Options["provides"] : undefined
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface TagClassAny extends Context.Tag<any, any> {
  readonly [TypeId]: TypeId
  readonly optional: boolean
  readonly provides?: Context.Tag<any, any> | undefined
  readonly failure: Schema.Schema.All
}

/**
 * @since 1.0.0
 * @category models
 */
export interface TagClassAnyWithProps extends Context.Tag<any, NextMiddleware<any, any, any>> {
  readonly [TypeId]: TypeId
  readonly optional: boolean
  readonly provides?: Context.Tag<any, any>
  readonly failure: Schema.Schema.All
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Tag = <Self>(): <
  const Name extends string,
  const Options extends {
    readonly optional?: boolean
    readonly failure?: Schema.Schema.All
    readonly provides?: Context.Tag<any, any>
  },
  R
>(
  id: Name,
  options?: Options | undefined
) => TagClass<Self, Name, Options, R> =>
(
  id: string,
  options?: {
    readonly optional?: boolean
    readonly failure?: Schema.Schema.All
    readonly provides?: Context.Tag<any, any>
  }
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
  TagClass_.failure = options?.optional === true || options?.failure === undefined ? Schema.Never : options.failure
  if (options?.provides) {
    TagClass_.provides = options.provides
  }
  TagClass_.optional = options?.optional ?? false
  return TagClass as any
}

/**
 * Create a Layer for a middleware implementation that accurately carries the
 * runtime environment requirements of the middleware into the Layer's R.
 *
 * This ensures that, if your middleware implementation yields from other
 * services (e.g. `yield* Other`), the resulting Layer type will reflect that
 * requirement, e.g. `Layer.Layer<AuthMiddleware, never, Other>` instead of
 * `never`.
 *
 * @since 1.0.0
 * @category constructors
 */
type InferR<T> = T extends (options: any) => Effect.Effect<any, any, infer R> ? R : never

export const layer = <
  M extends TagClassAnyWithProps,
  T extends NextMiddleware<any, any, any>
>(
  tag: M,
  impl: T
): Layer.Layer<Context.Tag.Identifier<M>, never, InferR<T>> => {
  // Read the required environment `R` at construction time to reflect it in the
  // Layer type, while still returning the concrete middleware implementation.
  return Layer_.effect(tag, Effect_.as(Effect_.context<InferR<T>>(), impl as any))
}
