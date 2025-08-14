import { Layer, Schema } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

export class ProvideUser extends NextMiddleware.Tag<ProvideUser>()(
  "ProvideUser",
  { provides: CurrentUser, failure: Schema.String }
) {}

const ProvideUserLive = Layer.succeed(
  ProvideUser,
  ProvideUser.of(() => Effect.succeed({ id: "u-1", name: "Alice" }))
)

const page = Next.make(ProvideUserLive)
  .page("Home")
  .setParamsSchema(Schema.Struct({ id: Schema.String }))
  .middleware(ProvideUser)
  .build(({ params }) =>
    Effect.gen(function*() {
      const user = yield* CurrentUser
      const resolvedParams = yield* params
      return { user, params: resolvedParams }
    })
  )

console.log(await page({ params: Promise.resolve({ id: "abc" }), searchParams: Promise.resolve({}) }))
