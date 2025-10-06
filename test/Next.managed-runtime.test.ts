import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import * as Next from "../src/Next.js"

describe("Next with provided ManagedRuntime", () => {
  it.effect("uses the provided ManagedRuntime to execute the handler", () =>
    Effect.gen(function*() {
      let calls = 0
      const runtime = {
        runPromiseExit(effect: Effect.Effect<any, any, never>) {
          calls++
          return Effect.runPromiseExit(effect as Effect.Effect<any, any, never>)
        }
      } as unknown as ManagedRuntime.ManagedRuntime<any, any>

      const page = Next.make("ProvidedRuntime", runtime)

      const result = yield* Effect.promise(() => page.build(() => Effect.succeed(123 as const))())

      assert.strictEqual(result, 123)
      assert.strictEqual(calls, 1)
    }))

  it.effect("does not register the runtime in the registry when provided by user", () =>
    Effect.gen(function*() {
      ;(globalThis as any).__effect_nextjs_runtime_registry__ = undefined

      let calls = 0
      const runtime = {
        runPromiseExit(effect: Effect.Effect<any, any, never>) {
          calls++
          return Effect.runPromiseExit(effect as Effect.Effect<any, any, never>)
        }
      } as unknown as ManagedRuntime.ManagedRuntime<any, any>

      const page = Next.make("NoRegistryForProvided", runtime)

      const _ = yield* Effect.promise(() => page.build(() => Effect.succeed("ok" as const))())
      assert.strictEqual(_, "ok")
      assert.strictEqual(calls, 1)

      const registry = (globalThis as any).__effect_nextjs_runtime_registry__ as
        | Record<string, ManagedRuntime.ManagedRuntime<any, any> | undefined>
        | undefined

      const key = (page as any).key as string
      assert.ok(!registry || registry[key] === undefined)
    }))
})
