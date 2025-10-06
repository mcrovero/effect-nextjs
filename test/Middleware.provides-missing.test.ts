import { assert, describe, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Middleware provides missing", () => {
  it.effect("accessing provided Tag without adding middleware fails", () =>
    Effect.gen(function*() {
      class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

      class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()(
        "AuthMiddleware",
        { provides: CurrentUser, failure: Schema.String }
      ) {}

      const AuthLive: Layer.Layer<AuthMiddleware> = Layer.succeed(
        AuthMiddleware,
        AuthMiddleware.of(() => Effect.succeed({ id: "1", name: "Ada" }))
      )

      // Provide the middleware implementation in the Layer, but DO NOT add it to the chain
      const page = Next.make("Base", Layer.mergeAll(AuthLive))

      const either = yield* Effect.tryPromise({
        try: () =>
          page.build(() =>
            // @ts-expect-error accessing CurrentUser without adding AuthMiddleware must be a type error
            Effect.gen(function*() {
              // Attempt to access the service that would be provided by the middleware
              const user = yield* CurrentUser
              return user.name
            })
          )(),
        catch: (e) => e as Error
      }).pipe(Effect.either)

      if (either._tag === "Right") {
        assert.fail("Expected missing service error, got success")
      } else {
        // Message should indicate the missing service; check for tag key
        const msg = String(either.left)
        assert.ok(/CurrentUser/.test(msg), `Expected error mentioning CurrentUser, got: ${msg}`)
      }
    }))
})
