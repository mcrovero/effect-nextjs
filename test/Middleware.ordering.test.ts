import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Middleware ordering", () => {
  it("non-wrapped then wrapped (page)", async () => {
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

    const result = await page.build(() =>
      Effect.gen(function*() {
        yield* Effect.sync(() => order.push("handler"))
        return "ok"
      })
    )({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })

    expect(result).toBe("ok")
    expect(order).toEqual(["wrap:start", "nonwrap", "wrap:start", "nonwrap", "handler", "wrap:end", "wrap:end"])
  })
  it("non-wrapped then wrapped (layout)", async () => {
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
      NonWrapped.of(() =>
        Effect.sync(() => {
          order.push("nonwrap")
        })
      )
    )

    const combined = Layer.mergeAll(WrappedLive, NonWrappedLive)
    const layout = Next.make(combined)
      .layout("OrderTestLayout")
      .middleware(Wrapped)
      .middleware(NonWrapped)
      .middleware(Wrapped)
      .middleware(NonWrapped)

    const result = await layout.build(() =>
      Effect.gen(function*() {
        yield* Effect.sync(() => order.push("handler"))
        return "ok"
      })
    )({ params: Promise.resolve({}), children: null })

    expect(result).toBe("ok")
    expect(order).toEqual(["wrap:start", "nonwrap", "wrap:start", "nonwrap", "handler", "wrap:end", "wrap:end"])
  })

  it("non-wrapped then wrapped (action)", async () => {
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
      NonWrapped.of(() =>
        Effect.gen(function*() {
          yield* Effect.sync(() => order.push("nonwrap"))
          return { _: Symbol("ok") } as any
        })
      )
    )

    const combined = Layer.mergeAll(WrappedLive, NonWrappedLive)
    const action = Next.make(combined)
      .action("OrderTestAction")
      .middleware(Wrapped)
      .middleware(NonWrapped)
      .middleware(Wrapped)
      .middleware(NonWrapped)

    const result = await action.build(async () =>
      Effect.gen(function*() {
        yield* Effect.sync(() => order.push("handler"))
        return "ok"
      })
    )({})

    expect(result).toBe("ok")
    expect(order).toEqual(["wrap:start", "nonwrap", "wrap:start", "nonwrap", "handler", "wrap:end", "wrap:end"])
  })

  it("non-wrapped then wrapped (server component)", async () => {
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
      NonWrapped.of(() =>
        Effect.sync(() => {
          order.push("nonwrap")
        })
      )
    )

    const combined = Layer.mergeAll(WrappedLive, NonWrappedLive)
    const component = Next.make(combined)
      .component("OrderTestComponent")
      .middleware(Wrapped)
      .middleware(NonWrapped)
      .middleware(Wrapped)
      .middleware(NonWrapped)

    const result = await component.build(() =>
      Effect.gen(function*() {
        yield* Effect.sync(() => order.push("handler"))
        return "ok"
      })
    )()

    expect(result).toBe("ok")
    expect(order).toEqual(["wrap:start", "nonwrap", "wrap:start", "nonwrap", "handler", "wrap:end", "wrap:end"])
  })
})
