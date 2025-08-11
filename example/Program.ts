import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"
import { NextPage } from "../src/index.js"

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

const AuthLive = Layer.effect(
  AuthMiddleware,
  Effect.gen(function*() {
    const user = yield* Other
    return AuthMiddleware.of(() => Effect.succeed({ id: "123", name: user.name }))
  })
)

const OtherMiddlewareLive = Layer.effect(
  OtherMiddleware,
  Effect.succeed(OtherMiddleware.of(() => Effect.succeed({ id: "999", name: "other" })))
)

const OtherLive = Layer.effect(
  Other,
  Effect.succeed({ id: "999", name: "other" })
)

const ProdLive = Layer.mergeAll(AuthLive.pipe(Layer.provide(OtherLive)), OtherLive)

const _page = Next.make(ProdLive).page("HomePage").middleware(AuthMiddleware).run(() =>
  Effect.gen(function*() {
    const user = yield* CurrentUser
    const other = yield* Other
    return { user, other }
  })
)
console.log(await _page)

