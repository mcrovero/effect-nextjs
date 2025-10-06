import { Layer } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

export class Other extends Context.Tag("Other")<Other, { id: string; name: string }>() {}

// A simple context tag for the current user
export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

// Non-wrapped middleware: runs before and provides a service
export class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()(
  "AuthMiddleware",
  {
    provides: CurrentUser,
    failure: Schema.String
  }
) {}

// Implementation for non-wrapped middleware: compute value to provide
const _AuthLive = Layer.effect(
  AuthMiddleware,
  Effect.gen(function*() {
    const other = yield* Other
    return AuthMiddleware.of(() =>
      Effect.gen(function*() {
        return yield* Effect.succeed({ id: "123", name: other.name })
      })
    )
  })
)

const ProdLive = Layer.mergeAll(_AuthLive.pipe(Layer.provide(Layer.succeed(Other, { id: "999", name: "Jane" }))))

// In page.tsx

const Page = ({ params }: { params: Promise<{ id: string }> }) =>
  Effect.gen(function*() {
    const user = yield* CurrentUser
    yield* Effect.fail("error")
    return { user, params }
  }).pipe(Effect.catchAll((e) => Effect.succeed({ error: e })))

export default Next.make("Base", ProdLive)
  .middleware(AuthMiddleware)
  .build(
    Page
  )
