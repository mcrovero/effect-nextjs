import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Middleware catches", () => {
  it("wrapped middleware catches handler failure and returns the error (page)", async () => {
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
    const page = Next.make(combined)
      .page("CatchesTestPage")
      .middleware(Wrapped)

    const result = await page.build(() =>
      Effect.gen(function*() {
        // Fail with a string; the wrapped middleware should catch and return it
        return yield* Effect.fail("boom")
      })
    )({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })

    expect(result).toBe("Catched: boom")
  })
})
