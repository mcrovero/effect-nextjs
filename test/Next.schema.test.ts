import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import { decodeParams, decodeSearchParams } from "../src/Next.js"

describe("Next schema failures", () => {
  class Dummy extends Context.Tag("Dummy")<Dummy, object>() {}
  const app = Next.make("Base", Layer.succeed(Dummy, {}))

  it.effect("rejects on invalid params schema", () =>
    Effect.gen(function*() {
      const either = yield* Effect.tryPromise({
        try: () =>
          app.build((
            props: {
              params: Promise<Record<string, string | Array<string> | undefined>>
              searchParams: Promise<Record<string, string | Array<string> | undefined>>
            }
          ) =>
            Effect.gen(function*() {
              const { params } = props
              yield* decodeParams(Schema.Struct({ id: Schema.Number }))({ params }).pipe(Effect.orDie)
              return "ok" as const
            })
          )({
            params: Promise.resolve({ id: "not-a-number" }),
            searchParams: Promise.resolve({})
          }),
        catch: (e) => e as Error
      }).pipe(Effect.either)
      assertTrue(either._tag === "Left")
    }))

  it.effect("rejects on invalid searchParams schema", () =>
    Effect.gen(function*() {
      const either = yield* Effect.tryPromise({
        try: () =>
          app.build((
            props: {
              params: Promise<Record<string, string | Array<string> | undefined>>
              searchParams: Promise<Record<string, string | Array<string> | undefined>>
            }
          ) =>
            Effect.gen(function*() {
              const { searchParams } = props
              yield* decodeSearchParams(Schema.Struct({ q: Schema.Number }))({ searchParams }).pipe(Effect.orDie)
              return "ok" as const
            })
          )({
            params: Promise.resolve({}),
            searchParams: Promise.resolve({ q: "nope" })
          }),
        catch: (e) => e as Error
      }).pipe(Effect.either)
      assertTrue(either._tag === "Left")
    }))
})
