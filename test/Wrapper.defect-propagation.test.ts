import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Wrapper defect propagation", () => {
  it.effect("wrapper does not catch defects; original error is thrown", () =>
    Effect.gen(function*() {
      class Catcher extends NextMiddleware.Tag<Catcher>()("Catcher", {
        wrap: true,
        // catches only typed failures, not defects
        catches: Schema.String
      }) {}

      const CatcherLive: Layer.Layer<Catcher> = Layer.succeed(
        Catcher,
        // Even if we try to catch failures from `next`, defects must escape untouched
        Catcher.of(({ next }) => next.pipe(Effect.catchAll(() => Effect.succeed("caught" as const))))
      )

      const page = Next.make("WrapperDefect", CatcherLive).middleware(Catcher)

      // Simulate Next.js control-flow error (e.g., redirect/notFound) as a defect
      class RedirectError extends Error {}
      const redirectError = new RedirectError("redirect")

      const either = yield* Effect.tryPromise({
        try: () =>
          page.build(() =>
            Effect.sync(() => {
              throw redirectError
            })
          )(),
        catch: (e) => e as Error
      }).pipe(Effect.either)

      if (either._tag === "Right") {
        assert.fail("Expected thrown error to escape as rejection")
      } else {
        // Must be the exact same instance that was thrown
        assert.ok(either.left === redirectError)
        assert.ok(either.left instanceof RedirectError)
      }
    }))
})
