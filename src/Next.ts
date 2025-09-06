import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

type NextBaseParams = { params: Promise<Record<string, string | Array<string> | undefined>> }
type NextBaseSearchParams = { searchParams: Promise<Record<string, string | Array<string> | undefined>> }

/**
 * @since 0.5.0
 * @category decode
 */
export const decodeParams = <T, P extends NextBaseParams>(
  schema: Schema.Schema<T, any, any>
) =>
(props: P) =>
  Effect.gen(function*() {
    const params = yield* Effect.promise(() => props.params)
    return yield* Schema.decodeUnknown(schema)(params)
  })

/**
 * @since 0.5.0
 * @category decode
 */
export const decodeSearchParams =
  <T, P extends NextBaseSearchParams>(schema: Schema.Schema<T, any, any>) => (props: P) =>
    Effect.gen(function*() {
      const searchParams = yield* Effect.promise(() => props.searchParams)
      return yield* Schema.decodeUnknown(schema)(searchParams)
    })
