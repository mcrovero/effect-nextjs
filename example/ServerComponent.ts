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

// In serverComponent.tsx

const _ServerComponent = Effect.fn("ServerComponent")(function*({ time }: { time: { now: number } }) {
  const server = yield* ServerTime
  return { time: { ...time, now: server.now + 1000 } }
})

export default Next.make("Base", TimeLive)
  .middleware(TimeMiddleware)
  .build(_ServerComponent)
