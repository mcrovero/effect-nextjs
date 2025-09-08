import { Layer, Schema } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { ParseError } from "effect/ParseResult"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

export class Theme extends Context.Tag("Theme")<Theme, { mode: "light" | "dark" }>() {}

export class ThemeMiddleware extends NextMiddleware.Tag<ThemeMiddleware>()(
  "ThemeMiddleware",
  { provides: Theme, failure: Schema.String }
) {}

const ThemeLive = Layer.succeed(
  ThemeMiddleware,
  ThemeMiddleware.of(() => Effect.succeed({ mode: "dark" }))
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

const app = Layer.mergeAll(CatchAllLive, ThemeLive)

const BaseLayout = Next.make("Root", app)
  .middleware(ThemeMiddleware)
  .middleware(CatchAll)

// In layout.tsx

const RootLayout = Effect.fn("RootLayout")(function*({ children, params }) {
  const theme = yield* Theme
  return { theme, params, children }
})

export default BaseLayout
  .build(
    RootLayout
  )
