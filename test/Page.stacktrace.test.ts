import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { describe, expect, it, vi } from "vitest"
import * as Next from "../src/Next.js"

describe("NextPage stacktrace", () => {
  it("logs enhanced stack including span name twice (definition and call)", async () => {
    class Dummy extends Context.Tag("Dummy")<Dummy, object>() {}
    const AppLive: Layer.Layer<Dummy> = Layer.succeed(Dummy, {})

    const page = Next.make(AppLive)
      .page("StackTraceTest")

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const result = await page.build(() =>
      Effect.gen(function*() {
        yield* Effect.fail(new Error("TestBoom"))
      }).pipe(
        Effect.catchAllCause(Effect.logError),
        Effect.as("ok")
      )
    )({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })

    expect(result).toBe("ok")
    const output = logSpy.mock.calls.map((args) => args.join(" ")).join("\n")
    expect(output).toContain("level=ERROR")
    const spanName = "StackTraceTest"
    const occurrences = (output.match(new RegExp(spanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    expect(occurrences).toBeGreaterThanOrEqual(1)
    logSpy.mockRestore()
  })
})
