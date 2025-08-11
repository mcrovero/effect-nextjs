import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

// A simple context tag for the current user
export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  { id: string; name: string }
>() {}

// A simple context tag for the current user
export class Other extends Context.Tag("Other")<
  Other,
  { id: string; name: string }
>() {}

// A middleware that will provide CurrentUser
export class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()(
  "AuthMiddleware",
  {
    provides: CurrentUser,
    failure: Schema.String
  }
) {}

// A middleware that will provide CurrentUser
export class OtherMiddleware extends NextMiddleware.Tag<OtherMiddleware>()(
  "OtherMiddleware",
  {
    provides: Other,
    failure: Schema.String
  }
) {}

// Live middleware implementation that extracts the user (dummy example)
export const AuthLive: Layer.Layer<AuthMiddleware> = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of(() => Effect.fail("test"))
)

const page = Next.make("HomePage").middleware(AuthMiddleware).toLayerHandler(() =>
  Effect.gen(function*() {
    const user = yield* CurrentUser
    return user
  })
)

const main = Layer.launch(page)

Effect.runPromise(main)
