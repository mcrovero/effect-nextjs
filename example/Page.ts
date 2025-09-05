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

export const decodeParams = <T>(schema: Schema.Schema<T, any, any>) => {
  return (props: { params: Promise<Record<string, string | Array<string> | undefined>> }) => {
    return Effect.gen(function*() {
      const params = yield* Effect.promise(() => props.params)
      return yield* Schema.decodeUnknown(schema)(params)
    })
  }
}

const page = BasePage
  .middleware(ProvideUser)
  .middleware(CatchAll)
  .build(
    Effect.fn("HomePage")(function*(props: { params: Promise<{ id: string }> }) {
      const params = yield* decodeParams(Schema.Struct({ id: Schema.String }))(props)
      return `Hello ${params.id}!`
    })
  )

const result = await page({ params: Promise.resolve({ id: "abc" }) })
console.log(result)

// const page2 = BasePage
//   .middleware(ProvideUser)
//   .middleware(CatchAll)
//   .build(({ params }: { params: Promise<{ id: string }> }) =>
//     Effect.gen(function*() {
//       yield* Effect.promise(() => params)
//       return "test"
//     })
//   )
