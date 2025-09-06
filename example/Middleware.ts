import { Layer } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

// A simple context tag for the current user
export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

// Wrapped middleware: can run before/after and provide a service
export class WrappedMiddleware extends NextMiddleware.Tag<WrappedMiddleware>()(
  "WrappedMiddleware",
  {
    provides: CurrentUser,
    failure: Schema.String,
    wrap: true
  }
) {}

// Non-wrapped middleware: runs before and provides a service
export class NotWrappedMiddleware extends NextMiddleware.Tag<NotWrappedMiddleware>()(
  "NotWrappedMiddleware",
  {
    provides: CurrentUser,
    failure: Schema.String
  }
) {}

// Implementation for wrapped middleware: decide when to run next and inject value
const _WrappedLive = Layer.succeed(
  WrappedMiddleware,
  WrappedMiddleware.of(({ next }) =>
    Effect.gen(function*() {
      return yield* Effect.provideService(next, CurrentUser, { id: "123", name: "other" })
    })
  )
)

// Implementation for non-wrapped middleware: compute value to provide
const _NotWrappedLive = Layer.succeed(
  NotWrappedMiddleware,
  NotWrappedMiddleware.of(() => Effect.succeed({ id: "123", name: "other" }))
)

const ProdLive = Layer.mergeAll(_WrappedLive, _NotWrappedLive)

const _page = Next.make("Base", ProdLive)
  .middleware(WrappedMiddleware)
  .middleware(NotWrappedMiddleware)
  .build(({ params }: { params: Promise<{ id: string }> }) =>
    Effect.gen(function*() {
      const user = yield* CurrentUser
      yield* Effect.fail("error")
      return { user, params }
    }).pipe(Effect.catchAll((e) => Effect.succeed({ error: e })))
  )

console.log(await _page({ params: Promise.resolve({ id: "abc" }) }))
