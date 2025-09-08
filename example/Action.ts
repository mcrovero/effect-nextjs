import { Layer, Schema } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { Next } from "src/index.js"
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

// In action.ts

const Action = Effect.fn("Action")(function*(input: { test: string }) {
  const user = yield* CurrentUser
  return { user, parsed: input.test }
})

// The async here is important to satisfy Next.js's requirement for server actions
export const action = async (props: { test: string }) =>
  Next.make("Base", AuthLive)
    .middleware(AuthMiddleware).build(
      Action
    )(props)
