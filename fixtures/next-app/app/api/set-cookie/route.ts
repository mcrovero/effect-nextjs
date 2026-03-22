import * as RequestState from "@mcrovero/effect-nextjs/Headers"
import * as Effect from "effect/Effect"
import { BaseRoute } from "../../../lib/runtime"

export const dynamic = "force-dynamic"

export const GET = BaseRoute.build(() =>
  Effect.gen(function*() {
    const cookies = yield* RequestState.Cookies
    cookies.set("session", "set-by-route")

    return Response.json({ ok: true })
  })
)
