import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as NextPage from "../src/NextPage.js"

describe("NextPage schema failures", () => {
  class Dummy extends Context.Tag("Dummy")<Dummy, object>() {}
  const app = NextPage.make("Base", Layer.succeed(Dummy, {}))

  it.effect("rejects on invalid params schema", () =>
    Effect.gen(function*() {
      const page = app.setParamsSchema(Schema.Struct({ id: Schema.Number }))
      const either = yield* Effect.tryPromise({
        try: () =>
          page.build(({ params }) => Effect.flatMap(Effect.orDie(params), () => Effect.succeed("ok" as const)))({
            params: Promise.resolve({ id: "not-a-number" }),
            searchParams: Promise.resolve({})
          }),
        catch: (e) => e as Error
      }).pipe(Effect.either)
      assertTrue(either._tag === "Left")
    }))

  it.effect("rejects on invalid searchParams schema", () =>
    Effect.gen(function*() {
      const page = app.setSearchParamsSchema(Schema.Struct({ q: Schema.Number }))
      const either = yield* Effect.tryPromise({
        try: () =>
          page.build(({ searchParams }) =>
            Effect.flatMap(Effect.orDie(searchParams), () => Effect.succeed("ok" as const))
          )({
            params: Promise.resolve({}),
            searchParams: Promise.resolve({ q: "nope" })
          }),
        catch: (e) => e as Error
      }).pipe(Effect.either)
      assertTrue(either._tag === "Left")
    }))
})
