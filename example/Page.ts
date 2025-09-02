import { Layer, Schema } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { ParseError } from "effect/ParseResult"
import * as NextMiddleware from "../src/NextMiddleware.js"
import * as NextPage from "../src/NextPage.js"

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

export class ProvideUser extends NextMiddleware.Tag<ProvideUser>()(
  "ProvideUser",
  { provides: CurrentUser, failure: Schema.String }
) {}

const ProvideUserLive = Layer.succeed(
  ProvideUser,
  ProvideUser.of(() => Effect.succeed({ id: "u-1", name: "Alice" }))
)

export class CatchAll extends NextMiddleware.Tag<CatchAll>()(
  "CatchAll",
  {
    catches: Schema.Union(Schema.String, Schema.instanceOf(ParseError)),
    wrap: true,
    returns: Schema.Struct({ success: Schema.Literal(false), error: Schema.String })
  }
) {}

const CatchAllLive = NextMiddleware.layer(
  CatchAll,
  ({ next }) =>
    Effect.gen(function*() {
      return yield* next.pipe(Effect.catchAll((e) => Effect.succeed({ error: e })))
    })
)

const app = Layer.mergeAll(CatchAllLive, ProvideUserLive)

const BasePage = NextPage.make("Home", app)

const page = BasePage
  .setParamsSchema(Schema.Struct({ id: Schema.String }))
  .middleware(ProvideUser)
  .middleware(CatchAll)
  .build(({ params }) =>
    Effect.gen(function*() {
      const user = yield* CurrentUser
      const resolvedParams = yield* params
      return { user, params: resolvedParams }
    })
  )

const result = await page({ params: Promise.resolve({ id: "abc" }), searchParams: Promise.resolve({}) })
console.log(result)
