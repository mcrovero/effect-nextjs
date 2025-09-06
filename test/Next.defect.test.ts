import { assert, describe, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { vi } from "vitest"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Next defects", () => {
  it.effect("logs die from handler", () =>
    Effect.gen(function*() {
      class Dummy0 extends Context.Tag("Dummy0")<Dummy0, object>() {}
      const page = Next.make("Base", Layer.succeed(Dummy0, {}))

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
      try {
        const result = yield* Effect.promise(() =>
          page.build(() =>
            Effect.die(new Error("boom-handler")).pipe(
              Effect.catchAllCause(Effect.logError),
              Effect.as("ok")
            )
          )()
        )

        assert.strictEqual(result, "ok")
        const output = logSpy.mock.calls.map((args) => args.join(" ")).join("\n")
        assert.ok(output.includes("level=ERROR"))
        assert.match(output, /boom-handler/)
      } finally {
        logSpy.mockRestore()
      }
    }))

  it.effect("logs die from middleware", () =>
    Effect.gen(function*() {
      class Dummy extends Context.Tag("Dummy")<Dummy, object>() {}

      class DefectMiddleware extends NextMiddleware.Tag<DefectMiddleware>()(
        "DefectMiddleware"
      ) {}

      const DefectLive: Layer.Layer<DefectMiddleware> = NextMiddleware.layer(
        DefectMiddleware,
        // Defer throwing to inside Effect to be caught/logged
        () =>
          Effect.sync(() => {
            throw new Error("boom-middleware")
          })
      )

      const app = Layer.mergeAll(Layer.succeed(Dummy, {}), DefectLive)

      const page = Next.make("Base", app)
        .middleware(DefectMiddleware)

      const either = yield* Effect.tryPromise({
        try: () => page.build(() => Effect.succeed("ok" as const))(),
        catch: (e) => e as Error
      }).pipe(Effect.either)

      if (either._tag === "Right") {
        assert.fail("Expected rejection, got success")
      } else {
        assert.match(either.left.message, /boom-middleware/)
      }
    }))
})
