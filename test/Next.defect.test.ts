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
      class Dummy0 extends Context.Service<Dummy0, object>()("Dummy0") {}
      const page = Next.make("Base", Layer.succeed(Dummy0, {}))

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
      try {
        const result = yield* Effect.promise(() =>
          page.build(() =>
            Effect.die(new Error("boom-handler")).pipe(
              Effect.catchCause(Effect.logError),
              Effect.as("ok")
            )
          )()
        )

        assert.strictEqual(result, "ok")
        const output = logSpy.mock.calls.map((args) => args.join(" ")).join("\n")
        assert.match(output, /ERROR/)
        assert.match(output, /boom-handler/)
      } finally {
        logSpy.mockRestore()
      }
    }))

  it.effect("logs die from middleware", () =>
    Effect.gen(function*() {
      class Dummy extends Context.Service<Dummy, object>()("Dummy") {}

      class DefectMiddleware extends NextMiddleware.Tag<DefectMiddleware>()(
        "DefectMiddleware"
      ) {}

      const DefectLive: Layer.Layer<DefectMiddleware> = Layer.succeed(
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
      }).pipe(Effect.result)

      if (either._tag === "Success") {
        assert.fail("Expected rejection, got success")
      } else {
        assert.match(either.failure.message, /boom-middleware/)
      }
    }))
})
