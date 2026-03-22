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
      }).pipe(Effect.either)

      if (either._tag === "Right") {
        assert.fail("Expected interrupt to reject")
      } else {
        assert.notStrictEqual(either.left, undefined)
        assert.ok(either.left instanceof Error)
        assert.match(String(either.left), /Interrupted/)
      }
    }))
})
