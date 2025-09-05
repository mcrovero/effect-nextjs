import { Layer, Schema } from "effect"
import * as Effect from "effect/Effect"
import * as NextPage from "../src/NextPage.js"

const app = Layer.empty

const BasePage = NextPage.make("Home", app as any)

const fn1 = Effect.fn("fn1")(function*() {
  yield* Effect.die(new Error("boom"))
})

const fn2 = Effect.fn("fn2")(function*() {
  yield* fn1()
})

const fn3 = Effect.fn("fn3")(function*() {
  yield* fn2()
})

const page = BasePage
  .setParamsSchema(Schema.Struct({ id: Schema.String }))
  .build(() =>
    Effect.gen(function*() {
      yield* fn3()
    })
  )

const result = await page({ params: Promise.resolve({ id: "abc" }), searchParams: Promise.resolve({}) }).catch((e) => {
  return e
})
console.log(result)
