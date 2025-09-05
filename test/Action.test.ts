import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as NextAction from "../src/NextAction.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("NextAction", () => {
  class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}
  class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()(
    "AuthMiddleware",
    { provides: CurrentUser, failure: Schema.String }
  ) {}

  const AuthLive: Layer.Layer<AuthMiddleware> = Layer.succeed(
    AuthMiddleware,
    AuthMiddleware.of(() => Effect.succeed({ id: "123", name: "John Doe" }))
  )

  it.effect("runs handler with provided services and decoded input", () =>
    Effect.gen(function*() {
      const action = NextAction.make("Base", AuthLive)
        .middleware(AuthMiddleware)

      const result = yield* Effect.promise(() =>
        action.build((input: { id: number }) =>
          Effect.gen(function*() {
            const user = yield* CurrentUser
            return { user, input }
          }).pipe(Effect.catchAll((e) => Effect.succeed({ error: e })))
        )({ id: 1 })
      )

      deepStrictEqual(result, { user: { id: "123", name: "John Doe" }, input: { id: 1 } })
    }))

  it.effect("accepts input as encoded and uses it decoded", () =>
    Effect.gen(function*() {
      const result = yield* Effect.promise(() =>
        NextAction.make("Submit", AuthLive)
          .middleware(AuthMiddleware)
          .build((input: { id: string }) =>
            Effect.gen(function*() {
              const user = yield* CurrentUser
              const decoded = yield* Schema.decode(Schema.Struct({ id: Schema.NumberFromString }))(input)
              return { user, input: decoded }
            }).pipe(Effect.catchAll((e) => Effect.succeed({ error: e })))
          )({ id: "1" })
      )

      deepStrictEqual(result, { user: { id: "123", name: "John Doe" }, input: { id: 1 } })
    }))
})
