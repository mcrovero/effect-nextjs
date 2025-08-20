import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import * as Next from "../src/Next.js"
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

  it("composes and exposes meta", () => {
    const action = Next.make(AuthLive)
      .action("Submit")
      .setInputSchema(Schema.Struct({ id: Schema.Number }))
      .middleware(AuthMiddleware)

    expect(action.key).toBe("@mcrovero/effect-nextjs/NextAction/Submit")
    const mws = [...action.middlewares]
    expect(mws).toContain(AuthMiddleware)
  })

  it("runs handler with provided services and decoded input", async () => {
    const action = Next.make(AuthLive)
      .action("Submit")
      .setInputSchema(Schema.Struct({ id: Schema.Number }))
      .middleware(AuthMiddleware)

    const result = await action.build(async ({ input }) =>
      Effect.gen(function*() {
        const user = yield* CurrentUser
        const decoded = yield* input
        return { user, input: decoded }
      }).pipe(Effect.catchTag("ParseError", (e) => Effect.succeed({ error: e })))
    )({ id: 1 })

    expect(result).toEqual({ user: { id: "123", name: "John Doe" }, input: { id: 1 } })
  })

  it("accepts input as encoded and uses it decoded", async () => {
    const action = Next.make(AuthLive)
      .action("Submit")
      .setInputSchema(Schema.Struct({ id: Schema.NumberFromString }))
      .middleware(AuthMiddleware)
      .build(async ({ input }) =>
        Effect.gen(function*() {
          const user = yield* CurrentUser
          const decoded = yield* input
          return { user, input: decoded }
        }).pipe(Effect.catchTag("ParseError", (e) => Effect.succeed({ error: e })))
      )({ id: "1" })

    const result = await action
    expect(result).toEqual({ user: { id: "123", name: "John Doe" }, input: { id: 1 } })
  })
})
