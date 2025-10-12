import { Layer, Schema } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { ParseError } from "effect/ParseResult"
import { decodeParamsUnknown } from "src/Params.js"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

export class ProvideUser extends NextMiddleware.Tag<ProvideUser>()(
  "ProvideUser",
  { provides: CurrentUser, failure: Schema.String }
) {}

const ProvideUserLive = Layer.succeed(
  ProvideUser,
  () => Effect.succeed({ id: "u-1", name: "Alice" })
)

export class CatchAll extends NextMiddleware.Tag<CatchAll>()(
  "CatchAll",
  {
    catches: Schema.Union(Schema.String, Schema.instanceOf(ParseError)),
    wrap: true,
    returns: Schema.Struct({ success: Schema.Literal(false), error: Schema.String })
  }
) {}

const CatchAllLive = Layer.succeed(
  CatchAll,
  CatchAll.of(({ next }) =>
    Effect.gen(function*() {
      return yield* next.pipe(Effect.catchAll((e) => Effect.succeed({ error: e })))
    })
  )
)

const app = Layer.mergeAll(CatchAllLive, ProvideUserLive)

const BasePage = Next.make("Home", app)

// In page.tsx

const HomePage = Effect.fn("HomePage")(function*(props: { params: Promise<Record<string, string | undefined>> }) {
  const params = yield* decodeParamsUnknown(Schema.Struct({ id: Schema.String }))(props.params)
  return `Hello ${params.id}!`
})

export default BasePage
  .middleware(ProvideUser)
  .middleware(CatchAll)
  .build(
    HomePage
  )
