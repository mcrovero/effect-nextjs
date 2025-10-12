import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { RedirectType } from "next/dist/client/components/redirect-error.js"
import { getRedirectError } from "next/dist/client/components/redirect.js"
import { notFound } from "next/navigation.js"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Wrapper defect propagation", () => {
  it.effect("rethrows Next notFound control-flow error (unchanged)", () =>
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

      const either = yield* Effect.tryPromise({
        try: () =>
          page.build(() =>
            Effect.sync(() => {
              notFound()
            })
          )(),
        catch: (e) => e as Error
      }).pipe(Effect.either)

      if (either._tag === "Right") {
        assert.fail("Expected notFound error to escape as rejection")
      } else {
        // Must be the exact same instance that was thrown
        assert.match((either.left as Error).message, /NEXT_HTTP_ERROR_FALLBACK;404/)
      }
    }))

  it.effect("rethrows Next redirect control-flow error (unchanged)", () =>
    Effect.gen(function*() {
      class Catcher extends NextMiddleware.Tag<Catcher>()("Catcher", {
        wrap: true,
        catches: Schema.String
      }) {}

      const CatcherLive: Layer.Layer<Catcher> = Layer.succeed(
        Catcher,
        Catcher.of(({ next }) => next.pipe(Effect.catchAll(() => Effect.succeed("caught" as const))))
      )

      const page = Next.make("WrapperDefectRedirect", CatcherLive).middleware(Catcher)

      // Create a redirect control-flow error instance without throwing (so we can assert identity)
      const redirectError = getRedirectError("/somewhere", RedirectType.replace) as Error

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
        assert.fail("Expected redirect error to escape as rejection")
      } else {
        // Must be the exact same instance that was thrown
        assert.ok(either.left === redirectError)
        assert.match((either.left as Error).message, /NEXT_REDIRECT/)
      }
    }))
})
