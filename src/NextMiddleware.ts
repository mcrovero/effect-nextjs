/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
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

/**
 * @since 1.0.0
 * @category models
 */
export interface NextMiddleware<Provides, E> {
  (options: { readonly clientId: number; readonly payload: unknown }): Effect.Effect<Provides, E>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface NextMiddlewareWrap<Provides, E> {
  (options: {
    readonly clientId: number
    readonly payload: unknown
    readonly next: Effect.Effect<SuccessValue, E, Provides>
  }): Effect.Effect<SuccessValue, E>
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
export type TagClass<Self, Name extends string, Options> = TagClass.Base<
  Self,
  Name,
  Options,
  TagClass.Wrap<Options> extends true ? NextMiddlewareWrap<TagClass.Provides<Options>, TagClass.Failure<Options>>
    : NextMiddleware<TagClass.Service<Options>, TagClass.FailureService<Options>>
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
  export type Wrap<Options> = Options extends { readonly wrap: true } ? true : false

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
    readonly wrap: Wrap<Options>
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
  readonly wrap: boolean
}

/**
 * @since 1.0.0
 * @category models
 */
export interface TagClassAnyWithProps
  extends Context.Tag<any, NextMiddleware<any, any> | NextMiddlewareWrap<any, any>>
{
  readonly [TypeId]: TypeId
  readonly optional: boolean
  readonly provides?: Context.Tag<any, any>
  readonly failure: Schema.Schema.All
  readonly wrap: boolean
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Tag = <Self>(): <
  const Name extends string,
  const Options extends {
    readonly wrap?: boolean
    readonly optional?: boolean
    readonly failure?: Schema.Schema.All
    readonly provides?: Context.Tag<any, any>
  }
>(
  id: Name,
  options?: Options | undefined
) => TagClass<Self, Name, Options> =>
(
  id: string,
  options?: {
    readonly optional?: boolean
    readonly failure?: Schema.Schema.All
    readonly provides?: Context.Tag<any, any>
    readonly wrap?: boolean
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
  TagClass_.wrap = options?.wrap ?? false
  return TagClass as any
}
