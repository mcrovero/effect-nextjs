import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
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
  class MiddlewareSlow extends NextMiddleware.Tag<MiddlewareSlow>()(
    "MiddlewareSlow",
    { provides: Obj, failure: Schema.String }
  ) {}

  const MiddlewareFastLive: Layer.Layer<MiddlewareFast> = Layer.succeed(
    MiddlewareFast,
    MiddlewareFast.of(() =>
      Effect.log("MiddlewareFast").pipe(
        Effect.andThen(() => Effect.sleep(1000)),
        Effect.as({ id: "1", name: "Object1" }),
        Effect.tap(() => Effect.log("MiddlewareFast done"))
      )
    )
  )
  const MiddlewareSlowLive: Layer.Layer<MiddlewareSlow> = Layer.succeed(
    MiddlewareSlow,
    MiddlewareSlow.of(() =>
      Effect.log("MiddlewareSlow").pipe(
        Effect.andThen(() => Effect.sleep(3000)),
        Effect.as({ id: "2", name: "Object2" }),
        Effect.tap(() => Effect.log("MiddlewareSlow done"))
      )
    )
  )

  it.effect("The provided service implementation at request time should be isolated", () =>
    Effect.gen(function*() {
      const combined = Layer.mergeAll(MiddlewareFastLive, MiddlewareSlowLive)
      const pageSlow = Next.make("Base", combined)
        .middleware(MiddlewareSlow).build(() => Obj)

      const pageFast = Next.make("Base", combined)
        .middleware(MiddlewareFast).build(() => Obj)

      const results = yield* Effect.all([
        Effect.promise(() => pageSlow()),
        Effect.promise(() => pageFast())
      ], { concurrency: "unbounded" })

      deepStrictEqual(results[0], { id: "2", name: "Object2" })
      deepStrictEqual(results[1], { id: "1", name: "Object1" })
    }))
})
