import { Layer, Schema } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
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

export class CatchMiddleware extends NextMiddleware.Tag<CatchMiddleware>()(
  "CatchMiddleware",
  { wrap: true, catches: Schema.String }
) {}

const CatchLive = Layer.succeed(
  CatchMiddleware,
  CatchMiddleware.of(() => Effect.succeed({ error: "boom" }))
)

const merged = Layer.mergeAll(ThemeLive, CatchLive)

const layout = Next.make(merged)
  .layout("RootLayout")
  .setParamsSchema(Schema.Struct({ locale: Schema.String }))
  .middleware(CatchMiddleware)
  .middleware(ThemeMiddleware)
  .build(({ children, params }) =>
    Effect.gen(function*() {
      const theme = yield* Theme
      const resolvedParams = yield* params
      yield* Effect.fail("boom")

      return { theme, params: resolvedParams, children }
    }).pipe(Effect.catchTag("ParseError", (e) => Effect.succeed({ error: e })))
  )

console.log(await layout({ children: "<div>Child</div>", params: Promise.resolve({ locale: "en" }) }))
