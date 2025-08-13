import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { describe, expect, expectTypeOf, it } from "vitest"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"
import type * as NextServerComponent from "../src/NextServerComponent.js"

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

  it("composes and exposes meta", () => {
    const component = Next.make(TimeLive)
      .component("ServerInfo")
      .middleware(TimeMiddleware)

    expect(component.key).toBe("@mcrovero/effect-nextjs/NextServerComponent/ServerInfo")
    const mws = [...component.middlewares]
    expect(mws).toContain(TimeMiddleware)
    expectTypeOf<NextServerComponent.HandlerFrom<typeof component>>()
  })

  it("runs handler with provided services", async () => {
    const component = Next.make(TimeLive)
      .component("ServerInfo")
      .middleware(TimeMiddleware)

    const result = await component.build(() =>
      Effect.gen(function*() {
        const time = yield* ServerTime
        return { time }
      })
    )()

    expect(result.time.now).toBeTypeOf("number")
  })
})
