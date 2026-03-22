import * as RequestState from "@mcrovero/effect-nextjs/Headers"
import * as Effect from "effect/Effect"
import { BaseRoute, RequestId, RequestIdMiddleware } from "../../../lib/runtime"

export const dynamic = "force-dynamic"

export const GET = BaseRoute.middleware(RequestIdMiddleware).build(() =>
  Effect.gen(function*() {
    const headers = yield* RequestState.Headers
    const cookies = yield* RequestState.Cookies
    const requestId = yield* RequestId

    return Response.json({
      directRequestId: headers.get("x-request-id"),
      middlewareRequestId: requestId.value,
      session: cookies.get("session")?.value ?? null
    })
  })
)
