import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("Middleware ordering", () => {
  it.effect("non-wrapped then wrapped (page)", () =>
    Effect.gen(function*() {
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
      const page = Next.make("Base", combined)
        .middleware(Wrapped)
        .middleware(NonWrapped)
        .middleware(Wrapped)
        .middleware(NonWrapped)

      const result = yield* Effect.promise(() =>
        page.build(() =>
          Effect.gen(function*() {
            yield* Effect.sync(() => order.push("handler"))
            return "ok"
          })
        )()
      )

      strictEqual(result, "ok")
      deepStrictEqual(order, ["wrap:start", "nonwrap", "wrap:start", "nonwrap", "handler", "wrap:end", "wrap:end"])
    }))
  it.effect("non-wrapped then wrapped (layout)", () =>
    Effect.gen(function*() {
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
      const layout = Next.make("Base", combined)
        .middleware(Wrapped)
        .middleware(NonWrapped)
        .middleware(Wrapped)
        .middleware(NonWrapped)

      const result = yield* Effect.promise(() =>
        layout.build(() =>
          Effect.gen(function*() {
            yield* Effect.sync(() => order.push("handler"))
            return "ok"
          })
        )()
      )

      strictEqual(result, "ok")
      deepStrictEqual(order, ["wrap:start", "nonwrap", "wrap:start", "nonwrap", "handler", "wrap:end", "wrap:end"])
    }))

  it.effect("non-wrapped then wrapped (action)", () =>
    Effect.gen(function*() {
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
      const action = Next.make("Base", combined)
        .middleware(Wrapped)
        .middleware(NonWrapped)
        .middleware(Wrapped)
        .middleware(NonWrapped)

      const result = yield* Effect.promise(
        action.build(() =>
          Effect.gen(function*() {
            yield* Effect.sync(() => order.push("handler"))
            return "ok"
          })
        )
      )

      strictEqual(result, "ok")
      deepStrictEqual(order, ["wrap:start", "nonwrap", "wrap:start", "nonwrap", "handler", "wrap:end", "wrap:end"])
    }))

  it.effect("non-wrapped then wrapped (server component)", () =>
    Effect.gen(function*() {
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
      const component = Next.make("Base", combined)
        .middleware(Wrapped)
        .middleware(NonWrapped)
        .middleware(Wrapped)
        .middleware(NonWrapped)

      const result = yield* Effect.promise(() =>
        component.build(() =>
          Effect.gen(function*() {
            yield* Effect.sync(() => order.push("handler"))
            return "ok"
          })
        )()
      )

      strictEqual(result, "ok")
      deepStrictEqual(order, ["wrap:start", "nonwrap", "wrap:start", "nonwrap", "handler", "wrap:end", "wrap:end"])
    }))
})
