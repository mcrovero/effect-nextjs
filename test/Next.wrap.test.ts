import { describe, it } from "@effect/vitest"
import { assertEquals } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Next wrap middleware", () => {
  it.effect("can override return value", () =>
    Effect.gen(function*() {
      class Dummy extends Context.Tag("Dummy")<Dummy, { id: string }>() {}

      class Wrap extends NextMiddleware.Tag<Wrap>()("Wrap", {
        wrap: true,
        catches: Schema.Never,
        returns: Schema.String
      }) {}

      const WrapLive: Layer.Layer<Wrap> = NextMiddleware.layer(
        Wrap,
        ({ next }) => Effect.as(next, "overridden")
      )

      const app = Next.make("Base", Layer.mergeAll(Layer.succeed(Dummy, { id: "1" }), WrapLive))
      const page = app.middleware(Wrap)

      const res = yield* Effect.promise(() =>
        page.build(() => Effect.succeed("original" as const))({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({})
        })
      )

      assertEquals(res, "overridden")
    }))
})
