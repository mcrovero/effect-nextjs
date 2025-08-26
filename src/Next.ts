import type { Layer } from "effect"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import * as NextAction from "./NextAction.js"
import * as NextLayout from "./NextLayout.js"
import * as NextPage from "./NextPage.js"
import * as NextServerComponent from "./NextServerComponent.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mcrovero/effect-nextjs/Next")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
}
/**
 * @since 1.0.0
 * @category constructors
 */
export interface AnySchema extends Pipeable {
  readonly [Schema.TypeId]: any
  readonly Type: any
  readonly Encoded: any
  readonly Context: any
  readonly make?: (params: any, ...rest: ReadonlyArray<any>) => any
  readonly ast: AST.AST
}

/**
 * @since 1.0.0
 * @category models
 */
export interface AnyWithProps {
  readonly [TypeId]: TypeId
  readonly key: string
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
}

type RuntimeFromLayer<L extends Layer.Layer<any, any, any>> = L extends Layer.Layer<infer ROut, any, any> ?
  ManagedRuntime.ManagedRuntime<ROut, any> :
  never

export interface Next<
  in out Layer extends Layer.Layer<any, any, any>
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly key: string
  readonly runtime: RuntimeFromLayer<Layer>

  page: (key: string) => NextPage.NextPage<string, RuntimeFromLayer<Layer>, never>
  layout: (key: string) => NextLayout.NextLayout<string, RuntimeFromLayer<Layer>, never>
  action: (key: string) => NextAction.NextAction<string, RuntimeFromLayer<Layer>, never>
  component: (key: string) => NextServerComponent.NextServerComponent<string, RuntimeFromLayer<Layer>, never>
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly key: string
  readonly layer: Layer.Layer<any, any, any>
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  page(this: Any, key: string) {
    return NextPage.make(key, this.runtime)
  },
  layout(this: Any, key: string) {
    return NextLayout.make(key, this.runtime)
  },
  action(this: Any, key: string) {
    return NextAction.make(key, this.runtime)
  },
  component(this: Any, key: string) {
    return NextServerComponent.make(key, this.runtime)
  }
}

const makeProto = <
  const Layer extends Layer.Layer<any, any, any>,
  const Runtime extends RuntimeFromLayer<Layer>
>(options: {
  readonly layer: Layer
  readonly runtime: Runtime
}): Next<Layer> => {
  function Next() {}
  Object.setPrototypeOf(Next, Proto)
  Object.assign(Next, options)
  Next.key = `@mcrovero/effect-nextjs/Next`
  return Next as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  const Layer extends Layer.Layer<any, any, never>
>(
  layer: Layer
): Next<Layer> => {
  const runtime = ManagedRuntime.make(layer) as RuntimeFromLayer<Layer>
  return makeProto({
    layer,
    runtime
  }) as any
}
