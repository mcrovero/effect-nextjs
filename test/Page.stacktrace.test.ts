import { describe, it } from "@effect/vitest"
import { assertTrue, strictEqual } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { vi } from "vitest"
import * as NextPage from "../src/NextPage.js"

describe("NextPage stacktrace", () => {
  it.effect("logs enhanced stack including span name twice (definition and call)", () =>
    Effect.gen(function*() {
      class Dummy extends Context.Tag("Dummy")<Dummy, object>() {}
      const AppLive: Layer.Layer<Dummy> = Layer.succeed(Dummy, {})

      const page = NextPage.make("Base", AppLive)

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
      try {
        const result = yield* Effect.promise(() =>
          page.build(() =>
            Effect.gen(function*() {
              yield* Effect.fail(new Error("TestBoom"))
            }).pipe(
              Effect.catchAllCause(Effect.logError),
              Effect.as("ok")
            )
          )({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })
        )

        strictEqual(result, "ok")
        const output = logSpy.mock.calls.map((args) => args.join(" ")).join("\n")
        assertTrue(output.includes("level=ERROR"))
        const spanName = "StackTraceTest"
        const occurrences =
          (output.match(new RegExp(spanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
        assertTrue(occurrences >= 1)
      } finally {
        logSpy.mockRestore()
      }
    }))
})
