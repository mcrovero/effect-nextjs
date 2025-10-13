import { Layer, Schema } from "effect"
import * as Effect from "effect/Effect"
import { decodeParamsUnknown } from "src/Params.js"
import * as Next from "../src/Next.js"

const BasePage = Next.make("Home", Layer.empty)

const ParamsSchema = Schema.Struct({ id: Schema.String })

const HomePage = Effect.fn("HomePage")(function*(props: { params: Promise<Record<string, string | undefined>> }) {
  const params = yield* Effect.orDie(decodeParamsUnknown(ParamsSchema)(props.params))
  return `Hello ${params.id}!`
})

export default BasePage
  .build(
    HomePage
  )
