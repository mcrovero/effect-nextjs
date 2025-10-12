import { Effect, Layer, ManagedRuntime } from "effect"

export class MyService extends Effect.Service<MyService>()("MyService", {
  scoped: Effect.gen(function*() {
    // Simulate resource initialization
    console.log("Service initialized")
    yield* Effect.addFinalizer(() => Effect.sync(() => console.log("disposed")))
    return {
      logHello: Effect.sync(() => console.log("Hello!!!"))
    }
  }),
  accessors: true
}) {}

export const stateful = Layer.mergeAll(MyService.Default)

export const statefulRuntime = ManagedRuntime.make(stateful)
export const effectStatefulContext = statefulRuntime.runtimeEffect.pipe(
  Effect.map((runtime) => runtime.context)
)
