import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { describe, expect, expectTypeOf, it } from "vitest"
import * as Next from "../src/Next.js"
import type * as NextAction from "../src/NextAction.js"
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

    expect(action.key).toBe("@mattiacrovero/effect-nextjs/NextAction/Submit")
    const mws = [...action.middlewares]
    expect(mws).toContain(AuthMiddleware)
    expectTypeOf<NextAction.HandlerInput<typeof action>>(undefined as any).toEqualTypeOf<{ id: number }>(
      undefined as any
    )
  })

  it("runs handler with provided services and decoded input", async () => {
    const action = Next.make(AuthLive)
      .action("Submit")
      .setInputSchema(Schema.Struct({ id: Schema.Number }))
      .middleware(AuthMiddleware)

    const result = await action.run(async ({ input }) =>
      Effect.gen(function*() {
        const user = yield* CurrentUser
        return { user, input }
      })
    )({ id: 1 })

    expect(result).toEqual({ user: { id: "123", name: "John Doe" }, input: { id: 1 } })
  })
})
