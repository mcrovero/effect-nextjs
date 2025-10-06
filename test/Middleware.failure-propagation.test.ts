import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Middleware failure propagation", () => {
  it.effect("non-wrapped middleware failure is catchable by wrapped middleware", () =>
    Effect.gen(function*() {
      // Non-wrapped middleware that fails with a string (typed by failure schema)
      class Failing extends NextMiddleware.Tag<Failing>()("Failing", {
        failure: Schema.String
      }) {}

      const FailingLive: Layer.Layer<Failing> = Layer.succeed(
        Failing,
        // Fail immediately in the middleware phase
        Failing.of(() => Effect.fail("mw-fail" as const))
      )

      // Wrapped middleware that catches string errors from `next`
      class Catcher extends NextMiddleware.Tag<Catcher>()("Catcher", {
        wrap: true,
        catches: Schema.String
      }) {}

      const CatcherLive: Layer.Layer<Catcher> = Layer.succeed(
        Catcher,
        Catcher.of(({ next }) => next.pipe(Effect.catchAll(() => Effect.succeed("recovered" as const))))
      )

      const app = Layer.mergeAll(FailingLive, CatcherLive)
      const page = Next.make("FailurePropagation", app)
        .middleware(Catcher)
        .middleware(Failing)

      const result = yield* Effect.promise(() => page.build(() => Effect.succeed("ok" as const))())
      assert.strictEqual(result, "recovered")
    }))

  it.effect("non-wrapped middleware failure bubbles when not caught", () =>
    Effect.gen(function*() {
      class Failing extends NextMiddleware.Tag<Failing>()("Failing", {
        failure: Schema.String
      }) {}

      const FailingLive: Layer.Layer<Failing> = Layer.succeed(
        Failing,
        Failing.of(() => Effect.fail("mw-fail" as const))
      )

      const page = Next.make("FailureBubble", FailingLive)
        .middleware(Failing)

      const either = yield* Effect.tryPromise({
        try: () => page.build(() => Effect.succeed("ok" as const))(),
        catch: (e) => e as Error
      }).pipe(Effect.either)

      if (either._tag === "Right") {
        assert.fail("Expected failure from middleware, got success")
      } else {
        assert.match(String(either.left), /mw-fail/)
      }
    }))
})
