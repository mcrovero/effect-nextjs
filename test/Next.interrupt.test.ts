import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Next from "../src/Next.js"

describe("Next interruption", () => {
  it.effect("rejects with an Error for pure interrupts", () =>
    Effect.gen(function*() {
      const page = Next.make("Interrupt", Layer.empty)

      const either = yield* Effect.tryPromise({
        try: () => page.build(() => Effect.interrupt)(),
        catch: (error) => error
      }).pipe(Effect.result)

      if (either._tag === "Success") {
        assert.fail("Expected interrupt to reject")
      } else {
        assert.notStrictEqual(either.failure, undefined)
        assert.ok(either.failure instanceof Error)
        assert.match(String(either.failure), /interrupted/i)
      }
    }))
})
