import { Effect, Schema } from "effect"

type NextBaseParams = Promise<Record<string, string | Array<string> | undefined>>
type NextBaseSearchParams = Promise<Record<string, string | Array<string> | undefined>>

export const decodeParamsUnknown = <T, P extends NextBaseParams>(schema: Schema.Schema<T, any>) => (
  (props: P) =>
    Effect.gen(function*() {
      const params = yield* Effect.promise(() => props)
      return yield* Schema.decodeUnknown(schema)(params)
    })
)

export const decodeSearchParamsUnknown =
  <T, P extends NextBaseSearchParams>(schema: Schema.Schema<T, any>) => (props: P) =>
    Effect.gen(function*() {
      const searchParams = yield* Effect.promise(() => props)
      return yield* Schema.decodeUnknown(schema)(searchParams)
    })

export const decodeParams = <T, P>(schema: Schema.Schema<T, P>) => (params: Promise<P>) => (
  Effect.gen(function*() {
    const paramsResolved = yield* Effect.promise(() => params)
    return yield* Effect.orDie(Schema.decode(schema)(paramsResolved))
  })
)
