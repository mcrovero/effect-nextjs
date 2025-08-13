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

const layout = Next.make(ThemeLive)
  .layout("RootLayout")
  .setParamsSchema(Schema.Struct({ locale: Schema.String }))
  .middleware(ThemeMiddleware)
  .build(({ params, children }) =>
    Effect.gen(function*() {
      const theme = yield* Theme
      return { theme, params, children }
    })
  )

console.log(await layout({ params: Promise.resolve({ locale: "en" }), children: "<div>Child</div>" }))

