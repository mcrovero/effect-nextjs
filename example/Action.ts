import { Layer, Schema } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Next from "../src/Next.js"
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

const action = Next.make(AuthLive).action("Submit")
  .setInputSchema(
    Schema.Struct({
      id: Schema.Number
    })
  )
  .middleware(AuthMiddleware)
  .build(async ({ input }) =>
    Effect.gen(function*() {
      const user = yield* CurrentUser
      return { user, input }
    })
  )

console.log(await action({ id: 123 }))
