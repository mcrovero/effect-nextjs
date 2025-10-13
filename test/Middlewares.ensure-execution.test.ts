import { describe, expect, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Next", () => {
  class Obj extends Context.Tag("Obj")<Obj, { id: string; name: string }>() {}

  class MiddlewareFast extends NextMiddleware.Tag<MiddlewareFast>()(
    "MiddlewareFast",
    { provides: Obj, failure: Schema.String }
  ) {}

  let executed = 0

  const MiddlewareFastLive: Layer.Layer<MiddlewareFast> = Layer.succeed(
    MiddlewareFast,
    MiddlewareFast.of(() =>
      Effect.log("MiddlewareFast").pipe(
        Effect.andThen(() =>
          Effect.sync(() => {
            executed += 1
          })
        ),
        Effect.tap(() => Effect.log("MiddlewareFast done")),
        Effect.as({ id: "1", name: "Object1" })
      )
    )
  )

  it.effect("The middleware effect should be executed even if the handler does not yield it", () =>
    Effect.gen(function*() {
      const combined = Layer.mergeAll(MiddlewareFastLive)
      const pageFast = Next.make("Base", combined)
        .middleware(MiddlewareFast)
        .build(() => Effect.succeed("ok"))

      yield* Effect.promise(() => pageFast())
      yield* Effect.sync(() => {
        expect(executed).toBe(1)
      })
    }))
})
