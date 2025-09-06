import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as NextMiddleware from "../src/NextMiddleware.js"
import * as NextPage from "../src/NextPage.js"

describe("Middleware catches", () => {
  it.effect("wrapped middleware catches handler failure and returns the error (page)", () =>
    Effect.gen(function*() {
      class Wrapped extends NextMiddleware.Tag<Wrapped>()("Wrapped", { wrap: true, catches: Schema.String }) {}

      // Use Layer.succeed with TagClass.of to avoid type issues for tests
      const WrappedLive: Layer.Layer<Wrapped> = Layer.succeed(
        Wrapped,
        Wrapped.of(({ next }) =>
          Effect.gen(function*() {
            const result = yield* next.pipe(
              Effect.catchAll((error) => Effect.succeed("Catched: " + error))
            )
            return result
          })
        )
      )

      const combined = Layer.mergeAll(WrappedLive)
      const page = NextPage.make("Base", combined)
        .middleware(Wrapped)

      const result = yield* Effect.promise(() =>
        page.build(() =>
          Effect.gen(function*() {
            return yield* Effect.fail("boom")
          })
        )({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })
      )

      strictEqual(result, "Catched: boom")
    }))
})
