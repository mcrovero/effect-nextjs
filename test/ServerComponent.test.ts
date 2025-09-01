import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("NextServerComponent", () => {
  class ServerTime extends Context.Tag("ServerTime")<ServerTime, { now: number }>() {}
  class TimeMiddleware extends NextMiddleware.Tag<TimeMiddleware>()(
    "TimeMiddleware",
    { provides: ServerTime }
  ) {}

  const TimeLive: Layer.Layer<TimeMiddleware> = Layer.succeed(
    TimeMiddleware,
    TimeMiddleware.of(() => Effect.succeed({ now: Date.now() }))
  )

  it.effect("runs handler with provided services", () =>
    Effect.gen(function*() {
      const component = Next.make("Base", TimeLive)
        .component("ServerInfo")
        .middleware(TimeMiddleware)

      const result = yield* Effect.promise(() =>
        component.build(() =>
          Effect.gen(function*() {
            const time = yield* ServerTime
            return { time }
          })
        )()
      )

      assertTrue(typeof result.time.now === "number")
    }))
})
