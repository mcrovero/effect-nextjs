import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

// Mirrors example/Program.ts, but as an integration test without invoking build()
describe("Program integration", () => {
  // Context tags
  class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}
  class Other extends Context.Tag("Other")<Other, { id: string; name: string }>() {}

  // Middlewares
  class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()(
    "AuthMiddleware",
    {
      provides: CurrentUser,
      failure: Schema.String
    }
  ) {}

  class OtherMiddleware extends NextMiddleware.Tag<OtherMiddleware>()(
    "OtherMiddleware",
    {
      provides: Other,
      failure: Schema.String
    }
  ) {}

  // Live implementations
  const AuthLive: Layer.Layer<AuthMiddleware> = Layer.succeed(
    AuthMiddleware,
    AuthMiddleware.of(() => Effect.succeed({ id: "123", name: "John Doe" }))
  )

  const OtherLive: Layer.Layer<OtherMiddleware> = Layer.succeed(
    OtherMiddleware,
    OtherMiddleware.of(() => Effect.succeed({ id: "456", name: "Jane Doe" }))
  )

  it("composes Next, NextPage and NextMiddleware as in Program example", () => {
    const combined = Layer.mergeAll(AuthLive, OtherLive)
    const page = Next.make(combined)
      .page("HomePage")
      .middleware(AuthMiddleware)
      .middleware(OtherMiddleware)

    // Asserts spanning modules
    expect(page.key).toBe("@mattiacrovero/effect-nextjs/NextPage/HomePage")
    expect(page.layer).toBe(combined)
    const mws = [...page.middlewares]
    expect(mws).toContain(AuthMiddleware)
    expect(mws).toContain(OtherMiddleware)

    // Middleware meta from Tag
    expect(AuthMiddleware[NextMiddleware.TypeId]).toBe(NextMiddleware.TypeId)
    expect(AuthMiddleware.provides).toBe(CurrentUser)
    expect(OtherMiddleware.provides).toBe(Other)
  })

  it("runs the page handler and returns provided services", async () => {
    const combined = Layer.mergeAll(AuthLive, OtherLive)
    const page = Next.make(combined)
      .page("HomePage")
      .middleware(AuthMiddleware)
      .middleware(OtherMiddleware)

    const result = await page.build(() =>
      Effect.gen(function*() {
        const user = yield* CurrentUser
        const other = yield* Other
        return { user, other }
      })
    )()

    expect(result).toEqual({
      user: { id: "123", name: "John Doe" },
      other: { id: "456", name: "Jane Doe" }
    })
  })

  it("composes NextLayout and NextMiddleware as in Program example", () => {
    const combined = Layer.mergeAll(AuthLive, OtherLive)
    const layout = Next.make(combined)
      .layout("RootLayout")
      .middleware(AuthMiddleware)
      .middleware(OtherMiddleware)

    expect(layout.key).toBe("@mattiacrovero/effect-nextjs/NextLayout/RootLayout")
    expect(layout.layer).toBe(combined)
    const mws = [...layout.middlewares]
    expect(mws).toContain(AuthMiddleware)
    expect(mws).toContain(OtherMiddleware)
  })

  it("composes NextAction and NextMiddleware as in Program example", () => {
    const combined = Layer.mergeAll(AuthLive, OtherLive)
    const action = Next.make(combined)
      .action("DoSomething")
      .middleware(AuthMiddleware)
      .middleware(OtherMiddleware)

    expect(action.key).toBe("@mattiacrovero/effect-nextjs/NextAction/DoSomething")
    expect(action.layer).toBe(combined)
    const mws = [...action.middlewares]
    expect(mws).toContain(AuthMiddleware)
    expect(mws).toContain(OtherMiddleware)
  })

  it("composes NextServerComponent and NextMiddleware as in Program example", () => {
    const combined = Layer.mergeAll(AuthLive, OtherLive)
    const component = Next.make(combined)
      .component("ServerInfo")
      .middleware(AuthMiddleware)
      .middleware(OtherMiddleware)

    expect(component.key).toBe("@mattiacrovero/effect-nextjs/NextServerComponent/ServerInfo")
    expect(component.layer).toBe(combined)
    const mws = [...component.middlewares]
    expect(mws).toContain(AuthMiddleware)
    expect(mws).toContain(OtherMiddleware)
  })
})
