import type { Layer } from "effect"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import * as NextPage from "./NextPage.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@mattiacrovero/effect-next/Next")

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
  readonly layer: Layer.Layer<any, any, any>
}

export interface Next<
  in out Layer extends Layer.Layer<any, any, any>
> extends Pipeable {
  new(_: never): object

  readonly [TypeId]: TypeId
  readonly key: string
  readonly layer: Layer

  page: (key: string) => NextPage.NextPage<string, Layer, never>
}

export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly key: string
  readonly layer: Layer.Layer<any, any, any>
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  page(this: Any, key: string) {
    return NextPage.make(key, this.layer)
  }
}

const makeProto = <
  const Layer extends Layer.Layer<any, any, any>
>(options: {
  readonly layer: Layer
}): Next<Layer> => {
  function Next() {}
  Object.setPrototypeOf(Next, Proto)
  Object.assign(Next, options)
  Next.key = `@mattiacrovero/effect-next/Next`
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
  return makeProto({
    layer
  }) as any
}
