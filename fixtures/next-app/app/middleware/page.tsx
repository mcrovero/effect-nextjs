import * as Effect from "effect/Effect"
import { BasePage, RequestId, RequestIdMiddleware } from "../../lib/runtime"

export const dynamic = "force-dynamic"

export default BasePage.middleware(RequestIdMiddleware).build(() =>
  Effect.gen(function*() {
    const requestId = yield* RequestId

    return (
      <pre id="payload">
        {JSON.stringify({
          requestId: requestId.value
        })}
      </pre>
    )
  })
)
