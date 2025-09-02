import { Layer } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as NextMiddleware from "../src/NextMiddleware.js"
import * as NextServerComponent from "../src/NextServerComponent.js"

export class ServerTime extends Context.Tag("ServerTime")<ServerTime, { now: number }>() {}

export class TimeMiddleware extends NextMiddleware.Tag<TimeMiddleware>()(
  "TimeMiddleware",
  { provides: ServerTime }
) {}

const TimeLive = Layer.succeed(
  TimeMiddleware,
  TimeMiddleware.of(() => Effect.succeed({ now: Date.now() }))
)

export default NextServerComponent.make("Base", TimeLive)
  .middleware(TimeMiddleware)
  .build(({ time }: { time: { now: number } }) =>
    Effect.gen(function*() {
      const server = yield* ServerTime

      return { time: { ...time, now: server.now + 1000 } }
    })
  )
