import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { describe, expect, expectTypeOf, it } from "vitest"
import * as Next from "../src/Next.js"
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

  it("composes and exposes meta", () => {
    const combined = Layer.mergeAll(AuthLive, OtherLive)
    const page = Next.make(combined)
      .page("Home")
      .setParamsSchema(Schema.Struct({ id: Schema.String }))
      .setSearchParamsSchema(Schema.Struct({ q: Schema.String }))
      .middleware(AuthMiddleware)
      .middleware(OtherMiddleware)

    expect(page.key).toBe("@mattiacrovero/effect-nextjs/NextPage/Home")
    expect(page.layer).toBe(combined)
    const mws = [...page.middlewares]
    expect(mws).toContain(AuthMiddleware)
    expect(mws).toContain(OtherMiddleware)

    expectTypeOf<NextPage.Params<typeof page>>().toEqualTypeOf<{ id: string }>()
    expectTypeOf<NextPage.SearchParams<typeof page>>().toEqualTypeOf<{ q: string }>()
  })

  it("runs handler with provided services and decoded params", async () => {
    const combined = Layer.mergeAll(AuthLive, OtherLive)
    const page = Next.make(combined)
      .page("Home")
      .setParamsSchema(Schema.Struct({ id: Schema.String }))
      .setSearchParamsSchema(Schema.Struct({ q: Schema.String }))
      .middleware(AuthMiddleware)
      .middleware(OtherMiddleware)

    const result = await page.run(({ params, searchParams }) =>
      Effect.gen(function*() {
        const user = yield* CurrentUser
        const other = yield* Other
        return { user, other, params, searchParams }
      })
    )({ params: Promise.resolve({ id: "p1" }), searchParams: Promise.resolve({ q: "hello" }) })

    expect(result).toEqual({
      user: { id: "123", name: "John Doe" },
      other: { id: "456", name: "Jane Doe" },
      params: { id: "p1" },
      searchParams: { q: "hello" }
    })
  })
})


