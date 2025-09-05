import { Layer, Schema } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as NextAction from "../src/NextAction.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

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
const AuthLive = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of(() => Effect.succeed({ id: "123", name: "other" }))
)

const action = NextAction.make("Base", AuthLive)
  .middleware(AuthMiddleware)
  .build(
    Effect.fn("Action")(function*({ test }: { test: string }) {
      const user = yield* CurrentUser
      return { user, parsed: test }
    })
  )

console.log(await action({ test: "123" }))
