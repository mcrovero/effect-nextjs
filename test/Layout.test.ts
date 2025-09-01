import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

describe("NextLayout", () => {
  class Theme extends Context.Tag("Theme")<Theme, { mode: "light" | "dark" }>() {}
  class ThemeMiddleware extends NextMiddleware.Tag<ThemeMiddleware>()(
    "ThemeMiddleware",
    { provides: Theme, failure: Schema.String }
  ) {}

  const ThemeLive: Layer.Layer<ThemeMiddleware> = Layer.succeed(
    ThemeMiddleware,
    ThemeMiddleware.of(() => Effect.succeed({ mode: "dark" }))
  )

  it.effect("runs handler with provided services and decoded params", () =>
    Effect.gen(function*() {
      const layout = Next.make("Base", ThemeLive)
        .layout("Root")
        .setParamsSchema(Schema.Struct({ locale: Schema.String }))
        .middleware(ThemeMiddleware)

      const result = yield* Effect.promise(() =>
        layout.build(({ children, params }) =>
          Effect.gen(function*() {
            const theme = yield* Theme
            const resolvedParams = yield* params
            return { theme, params: resolvedParams, children }
          }).pipe(Effect.catchTag("ParseError", (e) => Effect.succeed({ error: e })))
        )({ params: Promise.resolve({ locale: "en" }), children: "child" })
      )

      deepStrictEqual(result, { theme: { mode: "dark" }, params: { locale: "en" }, children: "child" })
    }))
})
