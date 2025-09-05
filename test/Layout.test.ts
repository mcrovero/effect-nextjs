import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { decodeParams } from "../src/Next.js"
import * as NextLayout from "../src/NextLayout.js"
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
      const layout = NextLayout.make("Root", ThemeLive)
        .middleware(ThemeMiddleware)

      const result = yield* Effect.promise(() =>
        layout.build(({ children, params }) =>
          Effect.gen(function*() {
            const theme = yield* Theme
            const decodedParams = yield* decodeParams(Schema.Struct({ locale: Schema.String }))({ params })
            return { theme, params: decodedParams, children }
          }).pipe(Effect.catchAll((e) => Effect.succeed({ error: e })))
        )({ params: Promise.resolve({ locale: "en" }), children: "child" })
      )

      deepStrictEqual(result, { theme: { mode: "dark" }, params: { locale: "en" }, children: "child" })
    }))
})
