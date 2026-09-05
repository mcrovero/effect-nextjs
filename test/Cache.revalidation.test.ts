import { assert, describe, it } from "@effect/vitest"
import { Layer } from "effect"
import * as Effect from "effect/Effect"
import { vi } from "vitest"
import * as Cache from "../src/Cache.js"
import * as Next from "../src/Next.js"

// Mock Next.js cache functions
const mockRevalidatePath = vi.fn()
const mockRevalidateTag = vi.fn()

vi.mock("next/cache.js", () => ({
  revalidatePath: (...args: Array<any>) => mockRevalidatePath(...args),
  revalidateTag: (...args: Array<any>) => mockRevalidateTag(...args)
}))

describe("Cache revalidation", () => {
  it.effect("forwards Next 16 cache profiles lazily", () =>
    Effect.gen(function*() {
      mockRevalidateTag.mockClear()
      const revalidate = Cache.RevalidateTag("profiled", "max")
      assert.strictEqual(mockRevalidateTag.mock.calls.length, 0)
      yield* revalidate
      yield* Cache.RevalidateTag("immediate", { expire: 0 })
      assert.deepStrictEqual(mockRevalidateTag.mock.calls, [["profiled", "max"], ["immediate", { expire: 0 }]])
    }))

  it.effect("revalidations execute immediately in order", () =>
    Effect.gen(function*() {
      mockRevalidatePath.mockClear()
      mockRevalidateTag.mockClear()

      const callOrder: Array<string> = []

      const page = Next.make("CacheTest", Layer.empty)

      const handler = Effect.gen(function*() {
        callOrder.push("start")
        yield* Cache.RevalidatePath("/path1")
        callOrder.push("after-path1")
        yield* Cache.RevalidateTag("tag1")
        callOrder.push("after-tag1")
        yield* Cache.RevalidatePath("/path2")
        callOrder.push("after-path2")
        return "done"
      })

      const result = yield* Effect.promise(() => page.build(() => handler)())

      assert.strictEqual(result, "done")
      assert.deepStrictEqual(callOrder, [
        "start",
        "after-path1",
        "after-tag1",
        "after-path2"
      ])

      // Verify revalidations were called
      assert.strictEqual(mockRevalidatePath.mock.calls.length, 2)
      assert.strictEqual(mockRevalidateTag.mock.calls.length, 1)
      assert.deepStrictEqual(mockRevalidatePath.mock.calls[0], ["/path1"])
      assert.deepStrictEqual(mockRevalidateTag.mock.calls[0], ["tag1", { expire: 0 }])
      assert.deepStrictEqual(mockRevalidatePath.mock.calls[1], ["/path2"])
    }))

  it.effect("revalidations don't execute if Effect fails before them", () =>
    Effect.gen(function*() {
      mockRevalidatePath.mockClear()
      mockRevalidateTag.mockClear()

      const page = Next.make("CacheTestFail", Layer.empty)

      const handler = Effect.gen(function*() {
        yield* Cache.RevalidatePath("/should-execute")
        yield* Effect.fail(new Error("Expected failure"))
        yield* Cache.RevalidatePath("/should-not-execute")
        return "done"
      })

      // Use tryPromise to handle the rejection
      const result = yield* Effect.tryPromise({
        try: () => page.build(() => handler as Effect.Effect<string, never, never>)(),
        catch: (error) => error
      }).pipe(Effect.flip)

      // Verify the error occurred
      assert.ok(result instanceof Error || typeof result === "object")

      // Verify only the first revalidation was called
      assert.strictEqual(mockRevalidatePath.mock.calls.length, 1)
      assert.deepStrictEqual(mockRevalidatePath.mock.calls[0], ["/should-execute"])
    }))

  it.effect("revalidations with type parameter work correctly", () =>
    Effect.gen(function*() {
      mockRevalidatePath.mockClear()
      mockRevalidateTag.mockClear()

      const page = Next.make("CacheTestTypes", Layer.empty)

      const handler = Effect.gen(function*() {
        yield* Cache.RevalidatePath("/page-path", "page")
        yield* Cache.RevalidatePath("/layout-path", "layout")
        yield* Cache.RevalidateTag("tag")
        return "done"
      })

      const result = yield* Effect.promise(() => page.build(() => handler)())

      assert.strictEqual(result, "done")
      assert.strictEqual(mockRevalidatePath.mock.calls.length, 2)
      assert.strictEqual(mockRevalidateTag.mock.calls.length, 1)
      assert.deepStrictEqual(mockRevalidatePath.mock.calls[0], ["/page-path", "page"])
      assert.deepStrictEqual(mockRevalidatePath.mock.calls[1], ["/layout-path", "layout"])
      assert.deepStrictEqual(mockRevalidateTag.mock.calls[0], ["tag", { expire: 0 }])
    }))

  it.effect("multiple revalidations of same path execute in order", () =>
    Effect.gen(function*() {
      mockRevalidatePath.mockClear()
      mockRevalidateTag.mockClear()

      const page = Next.make("CacheTestDuplicates", Layer.empty)

      const handler = Effect.gen(function*() {
        yield* Cache.RevalidatePath("/same-path")
        yield* Cache.RevalidatePath("/same-path")
        yield* Cache.RevalidatePath("/same-path")
        return "done"
      })

      const result = yield* Effect.promise(() => page.build(() => handler)())

      assert.strictEqual(result, "done")
      // All three calls should execute (no deduplication)
      assert.strictEqual(mockRevalidatePath.mock.calls.length, 3)
      assert.deepStrictEqual(mockRevalidatePath.mock.calls[0], ["/same-path"])
      assert.deepStrictEqual(mockRevalidatePath.mock.calls[1], ["/same-path"])
      assert.deepStrictEqual(mockRevalidatePath.mock.calls[2], ["/same-path"])
    }))

  it.effect("revalidations interleaved with other effects execute in correct order", () =>
    Effect.gen(function*() {
      mockRevalidatePath.mockClear()
      mockRevalidateTag.mockClear()

      const executionOrder: Array<string> = []

      const page = Next.make("CacheTestInterleaved", Layer.empty)

      const handler = Effect.gen(function*() {
        executionOrder.push("step-1")

        yield* Cache.RevalidatePath("/path")
        executionOrder.push("step-2")

        yield* Effect.sync(() => {/* no-op */})
        executionOrder.push("step-3")

        yield* Cache.RevalidateTag("tag")
        executionOrder.push("step-4")

        return "done"
      })

      const result = yield* Effect.promise(() => page.build(() => handler)())

      assert.strictEqual(result, "done")
      assert.deepStrictEqual(executionOrder, [
        "step-1",
        "step-2",
        "step-3",
        "step-4"
      ])

      assert.strictEqual(mockRevalidatePath.mock.calls.length, 1)
      assert.strictEqual(mockRevalidateTag.mock.calls.length, 1)
    }))
})
