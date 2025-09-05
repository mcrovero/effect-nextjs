import type { Pipeable } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"

type InferSchemaOutput<S> = S extends Schema.Schema<infer A, any, any> ? A : never
export type WrappedReturns<M> = M extends { readonly wrap: true }
  ? InferSchemaOutput<M extends { readonly returns: infer S } ? S : typeof Schema.Never>
  : never

export type CatchesFromMiddleware<M> = M extends { readonly catches: Schema.Schema<infer A, any, any> } ? A : never

/**
 * @since 0.5.0
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
