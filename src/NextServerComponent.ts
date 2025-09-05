/**
 * @since 0.5.0
 */
import type * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Effect_ from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import { executeWithRuntime } from "./internal/executor.js"
import { buildServerComponentEffect } from "./internal/next-server-component.js"
import { getRuntime, setRuntime } from "./internal/runtime-registry.js"
import {
  captureCallSite,
  captureDefinitionSite,
  makeCaptureCallSite,
  makeSpanAttributes
} from "./internal/stacktrace.js"
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

export interface AnyWithProps {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly middlewares: ReadonlyArray<NextMiddleware.TagClassAnyWithProps>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
}

type LayerSuccess<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ? ROut : never

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

  build<Props, Out, E extends CatchesFromMiddleware<Middleware>>(
    handler: (props: Props) => Effect<Out, E, ExtractProvides<NextServerComponent<Tag, L, Middleware>>>
  ): (props: Props) => Promise<Out | WrappedReturns<Middleware>>
}

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
  withRuntime(this: AnyWithProps, runtime: ManagedRuntime.ManagedRuntime<any, any>) {
    return makeProto({
      _tag: this._tag,
      runtime,
      middlewares: this.middlewares
    })
  },

  build(
    this: AnyWithProps,
    handler: (ctx: any) => Effect<any, any, any>
  ) {
    const runtime = this.runtime
    const spanName = this._tag
    const spanAttributes = makeSpanAttributes("NextServerComponent", this._tag)
    const errorDef = captureDefinitionSite()
    return (props?: any) => {
      const errorCall = captureCallSite()
      const program = buildServerComponentEffect(
        {
          middlewares: this.middlewares as ReadonlyArray<any>,
          spanName,
          spanAttributes
        },
        handler as any
      )(props)

      const effectWithSpan = Effect_.withSpan(program, spanName, {
        captureStackTrace: makeCaptureCallSite(errorDef, errorCall),
        attributes: spanAttributes
      })

      /**
       * In development we use global registry to get the runtime
       * to support hot-reloading.
       */
      const actualRuntime = getRuntime(`${NextServerComponentSymbolKey}/${this._tag}`, runtime)

      return executeWithRuntime(actualRuntime, effectWithSpan as Effect<any, any, never>)
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

type CatchesFromMiddleware<M> = M extends { readonly catches: Schema.Schema<infer A, any, any> } ? A
  : never

type InferSchemaOutput<S> = S extends Schema.Schema<infer A, any, any> ? A : never
type WrappedReturns<M> = M extends { readonly wrap: true }
  ? InferSchemaOutput<M extends { readonly returns: infer S } ? S : typeof Schema.Never>
  : never
