import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Middleware ordering", () => {
  it("non-wrapped then wrapped", async () => {
    const order: Array<string> = []

    class Wrapped extends NextMiddleware.Tag<Wrapped>()("Wrapped", { wrap: true }) {}
    class NonWrapped extends NextMiddleware.Tag<NonWrapped>()("NonWrapped") {}

    // Use Layer.succeed with TagClass.of to avoid type issues for tests
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
      NonWrapped.of(() =>
        Effect.sync(() => {
          order.push("nonwrap")
        })
      )
    )

    const combined = Layer.mergeAll(WrappedLive, NonWrappedLive)
    const page = Next.make(combined)
      .page("OrderTestA")
      .middleware(Wrapped)
      .middleware(NonWrapped)
      .middleware(Wrapped)
      .middleware(NonWrapped)

    const result = await page.run(() =>
      Effect.gen(function*() {
        yield* Effect.sync(() => order.push("handler"))
        return "ok"
      })
    )()

    expect(result).toBe("ok")
    expect(order).toEqual(["wrap:start", "nonwrap", "wrap:start", "nonwrap", "handler", "wrap:end", "wrap:end"])
  })
})
