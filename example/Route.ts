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

// In route.ts

const _GET = Effect.fn("ServerTimeRoute")(function*() {
  const server = yield* ServerTime
  return { server }
})

export const GET = Next.make("Base", TimeLive)
  .middleware(TimeMiddleware)
  .build(_GET)
