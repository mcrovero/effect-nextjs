import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Next from "../src/Next.js"
import * as NextMiddleware from "../src/NextMiddleware.js"

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()("AuthMiddleware", { provides: CurrentUser }) {}

const AuthLive = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of((options) =>
    Effect.gen(function*() {
      if (options._type === "route") {
        yield* Effect.log(options.method)
      }
      return { id: "123", name: "Alice" }
    })
  )
)

const app = Next.make(Layer.mergeAll(AuthLive))

export const route = app.route("ExampleRoute")
  .GET()
  .middleware(AuthMiddleware)
  .run(({ request }) => Effect.succeed(new Response("ok:" + request.method)))
