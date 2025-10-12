import { Effect, Schema } from "effect"

type NextBaseParams = Promise<
  Record<string, string | Array<string> | undefined>
>

/**
 * @since 0.30.0
 * @category params
 */
export const decodeParamsUnknown = <T, P extends NextBaseParams>(schema: Schema.Schema<T, any>) => (params: P) =>
  Effect.promise(() => params).pipe(
    Effect.flatMap(Schema.decodeUnknown(schema))
  )

/**
 * @since 0.30.0
 * @category params
 */
export const decodeSearchParamsUnknown =
  <T, P extends NextBaseParams>(schema: Schema.Schema<T, any>) => (searchParams: P) =>
    Effect.promise(() => searchParams).pipe(
      Effect.flatMap(Schema.decodeUnknown(schema))
    )

/**
 * @since 0.30.0
 * @category params
 */
export const decodeParams = <T, P>(schema: Schema.Schema<T, P>) => (params: Promise<P>) =>
  Effect.promise(() => params).pipe(
    Effect.flatMap(Schema.decode(schema))
  )
