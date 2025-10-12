import { Effect, Layer, ManagedRuntime } from "effect"
import { effectStatefulContext, MyService } from "./services-stateful.js"

export class MyServiceEphemeral extends Effect.Service<MyServiceEphemeral>()(
  "MyServiceEphemeral",
  {
    effect: Effect.gen(function*() {
      yield* MyService.logHello
      return {
        logHello: Effect.sync(() => console.log("Hello ephemeral!!!"))
      }
    }),
    accessors: true,
    dependencies: [Layer.effectContext(effectStatefulContext)]
  }
) {}

export const ephemeral = Layer.mergeAll(
  MyServiceEphemeral.Default
)

export const runtime = ManagedRuntime.make(ephemeral)
