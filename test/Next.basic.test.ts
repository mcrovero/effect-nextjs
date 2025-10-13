import { assert, describe, it } from "@effect/vitest"
import { Layer } from "effect"
import * as Effect from "effect/Effect"
import * as Next from "../src/Next.js"

describe("Next basic", () => {
  it.effect("build without middleware runs handler and returns result", () =>
    Effect.gen(function*() {
      const page = Next.make("Basic", Layer.empty)

      const result = yield* Effect.promise(() => page.build(() => Effect.succeed(42 as const))())
      assert.strictEqual(result, 42)
    }))
})
