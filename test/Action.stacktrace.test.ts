import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NextAction from "../src/NextAction.js"

describe("NextAction stacktrace", () => {
  it.effect("handles deeply nested Effect.fn calls correctly", () =>
    Effect.gen(function*() {
      class Dummy extends Context.Tag("Dummy")<Dummy, object>() {}
      const AppLive: Layer.Layer<Dummy> = Layer.succeed(Dummy, {})

      // Create a deeper nesting
      const level1 = Effect.fn("level1")(function*() {
        yield* Effect.die(new Error("deep_error"))
      })

      const level2 = Effect.fn("level2")(function*() {
        yield* level1()
      })

      const level3 = Effect.fn("level3")(function*() {
        yield* level2()
      })

      const level4 = Effect.fn("level4")(function*() {
        yield* level3()
      })

      const promise = NextAction.make("DeepTest", AppLive).runFn(
        "DeepAction",
        Effect.gen(function*() {
          yield* level4()
        })
      )

      const either = yield* Effect.tryPromise({
        try: () => promise,
        catch: (e) => e as Error
      }).pipe(Effect.either)

      assertTrue(either._tag === "Left", "Expected deeply nested action to fail")

      const error = either.left
      const stack = error.stack || ""

      // Verify all levels are captured
      assertTrue(stack.includes("level1"), "level1 should be in stacktrace")
      assertTrue(stack.includes("level2"), "level2 should be in stacktrace")
      assertTrue(stack.includes("level3"), "level3 should be in stacktrace")
      assertTrue(stack.includes("level4"), "level4 should be in stacktrace")
      assertTrue(stack.includes("DeepAction"), "Action span should be in stacktrace")
      assertTrue(stack.includes("deep_error"), "Error message should be in stacktrace")
    }))
})
