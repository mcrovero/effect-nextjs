import * as RequestState from "@mcrovero/effect-nextjs/Headers"
import * as Effect from "effect/Effect"
import { BasePage } from "../../lib/runtime"

export default BasePage.build(() =>
  Effect.gen(function*() {
    const headers = yield* RequestState.Headers
    const cookies = yield* RequestState.Cookies
    const draftMode = yield* RequestState.DraftMode

    return (
      <pre id="payload">
        {JSON.stringify({
          draftMode: draftMode.isEnabled,
          requestId: headers.get("x-request-id"),
          session: cookies.get("session")?.value ?? null
        })}
      </pre>
    )
  })
)
