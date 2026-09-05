import { Headers as RequestState, Next, NextMiddleware } from "@mcrovero/effect-nextjs"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export class RequestId extends Context.Service<RequestId, { value: string | null }>()("fixtures/next-app/RequestId") {}

export class RequestIdMiddleware extends NextMiddleware.Tag<RequestIdMiddleware>()(
  "fixtures/next-app/RequestIdMiddleware",
  { provides: RequestId }
) {}

const RequestIdLive = Layer.succeed(
  RequestIdMiddleware,
  RequestIdMiddleware.of(() =>
    Effect.gen(function*() {
      const headers = yield* RequestState.Headers
      return { value: headers.get("x-request-id") }
    })
  )
)

const AppLive = Layer.mergeAll(RequestIdLive)

export const BasePage = Next.make("fixtures/next-app/BasePage", AppLive)
export const BaseRoute = Next.make("fixtures/next-app/BaseRoute", AppLive)
