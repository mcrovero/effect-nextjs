import { Effect, Schema } from "effect"

type NextBaseParams = Promise<
  Record<string, string | Array<string> | undefined>
>

/**
 * @since 0.30.0
 * @category params
 */
export const decodeParamsUnknown = <S extends Schema.Constraint>(schema: S) => (params: NextBaseParams) =>
  Effect.promise(() => params).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema))
  )

/**
 * @since 0.30.0
 * @category params
 */
export const decodeSearchParamsUnknown = <S extends Schema.Constraint>(schema: S) => (searchParams: NextBaseParams) =>
  Effect.promise(() => searchParams).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema))
  )

/**
 * @since 0.30.0
 * @category params
 */
export const decodeParams = <S extends Schema.Constraint>(schema: S) => (params: Promise<S["Encoded"]>) =>
  Effect.promise(() => params).pipe(
    Effect.flatMap(Schema.decodeEffect(schema))
  )
