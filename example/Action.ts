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

// Action with tracing span
const _actionTraced = async (input: { test: string }) =>
  NextAction.make("Base", AuthLive)
    .middleware(AuthMiddleware)
    .runFn(
      "Action",
      Effect.gen(function*() {
        const user = yield* CurrentUser
        return { user, parsed: input.test }
      })
    )

// Action without tracing span
const _actionUntraced = async (input: { test: string }) =>
  NextAction.make("Base", AuthLive)
    .middleware(AuthMiddleware)
    .run(
      Effect.gen(function*() {
        const user = yield* CurrentUser
        return { user, parsed: input.test }
      })
    )

// Action traced with Effect.fn
type Input = { test: string }
const _actionFn = async (props: Input) =>
  NextAction.make("Base", AuthLive)
    .middleware(AuthMiddleware).run(
      Effect.fn("Action")(function*(input: Input) {
        const user = yield* CurrentUser
        return { user, parsed: input.test }
      })(props)
    )

// Or
const effect = Effect.fn("Action")(function*(input: Input) {
  const user = yield* CurrentUser
  return { user, parsed: input.test }
})
const _actionFn2 = async (props: Input) =>
  NextAction.make("Base", AuthLive)
    .middleware(AuthMiddleware).run(
      effect(props)
    )

console.log(_actionFn2)
