import { Layer } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

export class ServerTime extends Context.Tag("ServerTime")<ServerTime, { now: number }>() {}

export class TimeMiddleware extends NextMiddleware.Tag<TimeMiddleware>()(
  "TimeMiddleware",
  { provides: ServerTime }
) {}

const TimeLive = Layer.succeed(
  TimeMiddleware,
  TimeMiddleware.of(() => Effect.succeed({ now: Date.now() }))
)

const component = Next.make(TimeLive)
  .component("ServerInfo")
  .middleware(TimeMiddleware)
  .run(() =>
    Effect.gen(function*() {
      const time = yield* ServerTime
      return { time }
    })
  )

console.log(await component())

