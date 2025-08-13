import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Route handlers", () => {
  it("GET handler returns Response and middleware order holds", async () => {
    const order: Array<string> = []

    class Wrapped extends NextMiddleware.Tag<Wrapped>()("Wrapped", { wrap: true }) {}
    class NonWrapped extends NextMiddleware.Tag<NonWrapped>()("NonWrapped") {}

    const WrappedLive: Layer.Layer<Wrapped> = Layer.succeed(
      Wrapped,
      Wrapped.of(({ next }) =>
        Effect.gen(function*() {
          yield* Effect.sync(() => order.push("wrap:start"))
          const result = yield* next
          yield* Effect.sync(() => order.push("wrap:end"))
          return result
        })
      )
    )

    const NonWrappedLive: Layer.Layer<NonWrapped> = Layer.succeed(
      NonWrapped,
      NonWrapped.of(() => Effect.sync(() => order.push("nonwrap")))
    )

    const combined = Layer.mergeAll(WrappedLive, NonWrappedLive)
    const route = Next.make(combined)
      .route("RouteTest")
      .GET()
      .middleware(Wrapped)
      .middleware(NonWrapped)
      .middleware(Wrapped)
      .middleware(NonWrapped)

    const response = await route.run(({ request }) =>
      Effect.gen(function*() {
        yield* Effect.sync(() => order.push("handler"))
        return new Response("ok:" + request.method)
      })
    )(new Request("https://example.com/", { method: "GET" }))

    expect(await response.text()).toBe("ok:GET")
    expect(order).toEqual(["wrap:start", "nonwrap", "wrap:start", "nonwrap", "handler", "wrap:end", "wrap:end"])
  })
})


