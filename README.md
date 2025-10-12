# @mcrovero/effect-nextjs

[![npm version](https://img.shields.io/npm/v/%40mcrovero%2Feffect-nextjs.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@mcrovero/effect-nextjs)
[![license: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

Write your Next.js App Router pages, layouts, server components, routes, and actions with Effect without losing the Next.js developer experience.

- **End-to-end Effect**: Write your app logic as Effect while keeping familiar Next.js ergonomics.
- **Composable middlewares**: Add auth and other cross‑cutting concerns in a clear, reusable way.
- **Works with Next.js**: `redirect`, `notFound`, and other control‑flow behaviors just work. Also provides Effect versions of the utilities.
- **Safe routing**: Decode route params and search params with Effect Schema for safer handlers.
- **Cache‑ready**: Plays well with `@mcrovero/effect-react-cache` (react-cache wrapper) across pages, layouts, and components.

> [!WARNING]
> This library is in early alpha and is not ready for production use.

### Getting Started

1. Install effect and the library in an existing Next.js 15+ application

```sh
pnpm add @mcrovero/effect-nextjs effect
```

or create a new Next.js application first:

```sh
pnpx create-next-app@latest
```

2. Define Next effect runtime

```ts
// lib/runtime.ts
import { Next } from "@mcrovero/effect-nextjs"
import { Layer } from "effect"

const AppLive = Layer.empty // Your stateless layers
export const BasePage = Next.make("BasePage", AppLive)
```

> [!WARNING]
> It is important that all layers passed to the runtime are stateless. If you need to use a stateful layer like a database connection read below. (see [Stateful layers](#stateful-layers))

3. Write your first page

```ts
// app/page.tsx
import { BasePage } from "@/lib/runtime"
import { Effect } from "effect"

const HomePage = Effect.fn("HomePage")(function* () {
  return <div>Hello World</div>
})

export default BasePage.build(HomePage)
```

When using Effect.fn you'll get automatic telemetry spans for the page load and better stack traces.

4. Define a middleware

```ts
// lib/auth-runtime.ts
import { Next, NextMiddleware } from "@mcrovero/effect-nextjs"
import { Layer, Schema } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

// Middleware that provides CurrentUser and can fail with a string
export class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()("AuthMiddleware", {
  provides: CurrentUser,
  failure: Schema.String
}) {}

// Live implementation for the middleware
export const AuthLive = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of(() => Effect.succeed({ id: "123", name: "Ada" }))
)

// Create a typed page handler
export const AuthenticatedPage = Next.make("BasePage", AuthLive).middleware(AuthMiddleware)
```

5. Use the middleware in a page and get the CurrentUser value

```ts
// app/page.tsx
import { AuthenticatedPage, CurrentUser } from "@/lib/auth-runtime" // wherever you defined it
import { Effect } from "effect"

const HomePage = () =>
  Effect.gen(function* () {
    const user = yield* CurrentUser
    return <div>Hello {user.name}</div>
  })

export default AuthenticatedPage.build(HomePage)
```

You can provide as many middlewares as you want.

```ts
const HomePage = AuthenticatedPage.middleware(LocaleMiddleware).middleware(TimezoneMiddleware).build(HomePage)
```

> [!WARNING]
> The middleware order is important. The middleware will be executed in the order they are provided from left to right.

### Effect Next.js utilities

When you need to use nextjs utilities like redirect, notFound, etc. you need to call them using Effect.sync. Code with side effects should always be lazy in Effect.

```ts
import { Effect } from "effect"
import { redirect } from "next/navigation"

const HomePage = Effect.fn("HomePage")(function* () {
  yield* Effect.sync(() => redirect("/somewhere"))
})
export default BasePage.build(HomePage)
```

Or you can use the Effect version of the utility functions like `Redirect` or `NotFound`.

```ts
import { Effect } from "effect"
import { Redirect } from "@mcrovero/effect-nextjs/Navigation"

const HomePage = Effect.fn("HomePage")(function* () {
  yield* Redirect("/somewhere")
})
export default BasePage.build(HomePage)
```

Navigation:

```ts
import { Redirect, PermanentRedirect, NotFound } from "@mcrovero/effect-nextjs/Navigation"

const HomePage = Effect.fn("HomePage")(function* () {
  yield* Redirect("/somewhere")
  yield* PermanentRedirect("/somewhere")
  yield* NotFound
})
```

Cache:

```ts
import { RevalidatePath, RevalidateTag } from "@mcrovero/effect-nextjs/Cache"

const HomePage = Effect.fn("HomePage")(function* () {
  yield* RevalidatePath("/")
  yield* RevalidateTag("tag")
})
```

Headers:

```ts
import { Headers, Cookies, DraftMode } from "@mcrovero/effect-nextjs/Headers"
Ø
const HomePage = Effect.fn("HomePage")(function* () {
  const headers = yield* Headers
  const cookies = yield* Cookies
  const draftMode = yield* DraftMode
})
```

### Params and Search Params

You should always validate the params and search params with Effect Schema.

```ts
import { BasePage } from "@/lib/runtime"
import { decodeParamsUnknown, decodeSearchParamsUnknown } from "@mcrovero/effect-nextjs/Params"
import { Effect, Schema } from "effect"

const HomePage = Effect.fn("HomePage")((props) =>
  Effect.all([
    decodeParamsUnknown(Schema.Struct({ id: Schema.optional(Schema.String) }))(props.params),
    decodeSearchParamsUnknown(Schema.Struct({ name: Schema.optional(Schema.String) }))(props.searchParams)
  ]).pipe(
    Effect.map(([params, searchParams]) => (
      <div>
        Id: {params.id} Name: {searchParams.name}
      </div>
    )),
    Effect.catchTag("ParseError", () => Effect.succeed(<div>Error decoding params</div>))
  )
)

export default BasePage.build(HomePage)
```

### Wrapped middlewares

You can use wrapped middlewares (`wrap: true`) to run before and after the handler.

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { Layer, Schema } from "effect"
import { Next, NextMiddleware } from "@mcrovero/effect-nextjs"

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

export class Wrapped extends NextMiddleware.Tag<Wrapped>()("Wrapped", {
  provides: CurrentUser,
  failure: Schema.String,
  wrap: true
}) {}

const WrappedLive = Layer.succeed(
  Wrapped,
  Wrapped.of(({ next }) =>
    Effect.gen(function* () {
      yield* Effect.log("before")
      // pre logic...
      const out = yield* Effect.provideService(next, CurrentUser, { id: "u1", name: "Ada" })
      // post logic...
      yield* Effect.log("after")
      return out
    })
  )
)

const AppLive = Layer.mergeAll(WrappedLive)
const Page = Next.make("Home", AppLive).middleware(Wrapped)
```

### Stateful layers

When using a stateful layer there is no clean way to dispose it safely on HMR in development. You should define the Next runtime globally using `globalValue` from `effect/GlobalValue`.

```ts
import { Next } from "@mcrovero/effect-nextjs"
import { Effect, ManagedRuntime } from "effect"
import { globalValue } from "effect/GlobalValue"

export class StatefulService extends Effect.Service<StatefulService>()("app/StatefulService", {
  scoped: Effect.gen(function* () {
    yield* Effect.log("StatefulService scoped")
    yield* Effect.addFinalizer(() => Effect.log("StatefulService finalizer"))
    return {}
  })
}) {}

export const statefulRuntime = globalValue("BasePage", () => {
  const managedRuntime = ManagedRuntime.make(StatefulService.Default)
  process.on("SIGINT", () => {
    managedRuntime.dispose()
  })
  process.on("SIGTERM", () => {
    managedRuntime.dispose()
  })
  return managedRuntime
})
```

Then you can use it directly using `Next.makeWithRuntime`.

```ts
export const BasePage = Next.makeWithRuntime("BasePage", statefulRuntime)
```

Or you can extract the context you need from the stateful runtime and using it in a stateless layer.
This way you'll get HMR for the stateless layer and clean disposal of the stateful runtime.

```ts
const EphemeralLayer = Layer.effectContext(statefulRuntime.runtimeEffect.pipe(Effect.map((runtime) => runtime.context)))

export const BasePage = Next.make("BasePage", EphemeralLayer)
```

### Next.js Route Props Helpers Integration

With Next.js 15.5, you can now use the globally available `PageProps` and `LayoutProps` types for fully typed route parameters without manual definitions. You can use them with this library as follows:

```ts
import * as Effect from "effect/Effect"
import { Next } from "@mcrovero/effect-nextjs"

// Page with typed route parameters
const BlogPage = Effect.fn("BlogHandler")(function* (props: PageProps<"/blog/[slug]">) {
  const { slug } = yield* Effect.promise(() => props.params)
  return (
    <article>
      <h1>Blog Post: {slug}</h1>
      <p>Content for {slug}</p>
    </article>
  )
})

export default Next.make("BlogPage", AppLive).build(BlØogPage)

// Layout with parallel routes support
const DashboardLayout = Effect.fn("DashboardLayout")(function* (props: LayoutProps<"/dashboard">) {
  // Fully typed parallel route slots
  return (
    <div>
      {props.children}
      {props.analytics} {/* Fully typed */}
      {props.team} {/* Fully typed */}
    </div>
  )
})
export default Next.make("DashboardLayout", AppLive).build(DashboardLayout)
```

See the official documentation: - [Next.js 15.5 – Route Props Helpers](https://nextjs.org/docs/app/getting-started/layouts-and-pages#route-props-helpers)

### OpenTelemetry

Setup nextjs telemetry following official documentation: - [OpenTelemetry](https://nextjs.org/docs/app/guides/open-telemetry)

Then install @effect/opentelemetry

```sh
pnpm add @effect/opentelemetry
```

Create the tracer layer

```ts
import { Tracer as OtelTracer, Resource } from "@effect/opentelemetry"
import { Effect, Layer, Option } from "effect"

export const layerTracer = OtelTracer.layerGlobal.pipe(
  Layer.provide(
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const resource = yield* Effect.serviceOption(Resource.Resource)
        if (Option.isSome(resource)) {
          return Layer.succeed(Resource.Resource, resource.value)
        }
        return Resource.layerFromEnv()
      })
    )
  )
)
```

and provide it to the Next runtime

```ts
export const AppLiveWithTracer = AppLive.pipe(Layer.provideMerge(layerTracer))
```

```ts
export const BasePage = Next.make("BasePage", AppLiveWithTracer)
```
