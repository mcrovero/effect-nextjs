import { Context, Effect, Schema, SchemaGetter } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"
import { decodeParams, decodeParamsUnknown, decodeSearchParamsUnknown } from "../src/Params.js"

describe("Params with Effect v4 schemas", () => {
  const schema = Schema.Struct({ id: Schema.NumberFromString })

  it("decodes typed and unknown route params using transformations", async () => {
    expect(await Effect.runPromise(decodeParams(schema)(Promise.resolve({ id: "42" })))).toEqual({ id: 42 })
    expect(await Effect.runPromise(decodeParamsUnknown(schema)(Promise.resolve({ id: "42" })))).toEqual({ id: 42 })
  })

  it("decodes search params and preserves repeated values", async () => {
    const search = Schema.Struct({ tags: Schema.Array(Schema.String) })
    expect(await Effect.runPromise(decodeSearchParamsUnknown(search)(Promise.resolve({ tags: ["a", "b"] }))))
      .toEqual({ tags: ["a", "b"] })
  })

  it("exposes SchemaError as a typed failure", async () => {
    const result = await Effect.runPromise(
      decodeParamsUnknown(schema)(Promise.resolve({})).pipe(Effect.result)
    )
    expect(result._tag).toBe("Failure")
    if (result._tag === "Failure") expect(result.failure).toBeInstanceOf(Schema.SchemaError)
  })

  it("preserves and supplies schema decoding services", async () => {
    class Prefix extends Context.Service<Prefix, string>()("Params/Prefix") {}
    const prefixed = Schema.String.pipe(Schema.decodeTo(Schema.String, {
      decode: SchemaGetter.transformOrFail((value) => Effect.map(Prefix, (prefix) => prefix + value)),
      encode: SchemaGetter.transform((value) => value)
    }))
    const effectfulSchema = Schema.Struct({ id: prefixed })
    const params = Promise.resolve({ id: "42" })
    for (
      const decoded of [
        decodeParams(effectfulSchema)(params),
        decodeParamsUnknown(effectfulSchema)(params),
        decodeSearchParamsUnknown(effectfulSchema)(params)
      ]
    ) {
      expectTypeOf(decoded).toEqualTypeOf<Effect.Effect<{ readonly id: string }, Schema.SchemaError, Prefix>>()
      expect(await Effect.runPromise(decoded.pipe(Effect.provideService(Prefix, "id-")))).toEqual({ id: "id-42" })
    }
  })
})
