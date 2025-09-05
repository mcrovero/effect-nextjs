import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { decodeParams, decodeSearchParams } from "../src/Next.js"
import * as NextPage from "../src/NextPage.js"

describe("NextPage schema failures", () => {
  class Dummy extends Context.Tag("Dummy")<Dummy, object>() {}
  const app = NextPage.make("Base", Layer.succeed(Dummy, {}))

  it.effect("rejects on invalid params schema", () =>
    Effect.gen(function*() {
      const either = yield* Effect.tryPromise({
        try: () =>
          app.build(({ params }) =>
            Effect.gen(function*() {
              const _decoded = yield* decodeParams(Schema.Struct({ id: Schema.Number }))({ params })
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
          app.build(({ searchParams }) =>
            Effect.gen(function*() {
              const _decoded = yield* decodeSearchParams(Schema.Struct({ q: Schema.Number }))({ searchParams })
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
