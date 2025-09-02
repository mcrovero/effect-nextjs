import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as NextMiddleware from "../src/NextMiddleware.js"
import * as NextPage from "../src/NextPage.js"

describe("NextPage", () => {
  class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}
  class Other extends Context.Tag("Other")<Other, { id: string; name: string }>() {}

  class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()(
    "AuthMiddleware",
    { provides: CurrentUser, failure: Schema.String }
  ) {}
  class OtherMiddleware extends NextMiddleware.Tag<OtherMiddleware>()(
    "OtherMiddleware",
    { provides: Other, failure: Schema.String }
  ) {}

  const AuthLive: Layer.Layer<AuthMiddleware> = Layer.succeed(
    AuthMiddleware,
    AuthMiddleware.of(() => Effect.succeed({ id: "123", name: "John Doe" }))
  )
  const OtherLive: Layer.Layer<OtherMiddleware> = Layer.succeed(
    OtherMiddleware,
    OtherMiddleware.of(() => Effect.succeed({ id: "456", name: "Jane Doe" }))
  )

  it.effect("runs handler with provided services and decoded params", () =>
    Effect.gen(function*() {
      const combined = Layer.mergeAll(AuthLive, OtherLive)
      const page = NextPage.make("Base", combined)
        .setParamsSchema(Schema.Struct({ id: Schema.String }))
        .setSearchParamsSchema(Schema.Struct({ q: Schema.String }))
        .middleware(AuthMiddleware)
        .middleware(OtherMiddleware)

      const result = yield* Effect.promise(() =>
        page.build(({ params, searchParams }) =>
          Effect.gen(function*() {
            const user = yield* CurrentUser
            const other = yield* Other
            const resolvedParams = yield* params
            const resolvedSearchParams = yield* searchParams
            return { user, other, params: resolvedParams, searchParams: resolvedSearchParams }
          }).pipe(Effect.catchAll(() => Effect.succeed({ error: "error" })))
        )({ params: Promise.resolve({ id: "p1" }), searchParams: Promise.resolve({ q: "hello" }) })
      )

      deepStrictEqual(result, {
        user: { id: "123", name: "John Doe" },
        other: { id: "456", name: "Jane Doe" },
        params: { id: "p1" },
        searchParams: { q: "hello" }
      })
    }))
})
