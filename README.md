# @mcrovero/effect-nextjs

Wrapper around Next.js App Router to build pages, layouts, server components, routes, and server actions in the Effect world. Compose middlewares as `Context.Tag`s, validate params/search params/input with `Schema`, and build your `Effect` programs with a single call.

[![npm version](https://img.shields.io/npm/v/%40mcrovero%2Feffect-nextjs.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@mcrovero/effect-nextjs)
[![license: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

> [!WARNING]
> This library is in early alpha and is not ready for production use.
>
> ### Breaking changes (v0.11.0)
>
> - Consolidated builders: use `Next.make(tag, layer)` for pages, layouts, server components, routes, and server actions.
> - Removed `Next.make().actions()/.layout()/.component()`, `NextPage`, `NextLayout`, and `NextServerComponent`.
> - Server actions: use `Next.make(tag, layer).build(handler)` and export an async function that calls the built handler. `NextAction` is deprecated and will be removed in a future release.
> - Removed `.setParamsSchema(...)`, `.setSearchParamsSchema(...)`, and `.setInputSchema(...)`. Use the helpers inside your handler:
>   - `yield* Next.decodeParams(schema)(props)`
>   - `yield* Next.decodeSearchParams(schema)(props)`
>
> The `tag` passed to `Next.make` should be unique per handler to enable safe HMR during development.
>
> Read at the bottom of the README for more details on the decisions behind the new API.

### Why this library

- **End to end Effect**: You can bring effect gains up to the edge of your nextjs server.
- **Composable middlewares**: Add middlewares as `Context.Tag`s. Support for both provide-style and `wrap: true` middlewares, with typed `failure`/`catches`/`returns`.
- **Next.js control flow preserved**: `redirect`, `notFound` etc.. work correctly when thrown inside `Effect` programs (errors are mapped so Next.js handles them as expected).
- **Dev HMR safety**: In development, previous `ManagedRuntime`s are disposed on hot reload to prevent resource leaks.
- **Typed decoding helpers**: Opt-in helpers to parse `params` and `searchParams` using `Schema`.
- **Per-handler runtime**: Each page/layout/action/component runs on a `ManagedRuntime` built from your `Layer`.
- **Works with caching**: Pairs well with `@mcrovero/effect-react-cache` for cross-route Effect caching across pages, layouts, components, and routes.
- **Enriched error stacktraces**: Errors from `Effect` programs are rethrown with a readable stack using `Cause.pretty` in `src/internal/executor.ts`, making debugging much clearer in Next.js.

### Getting Started

1. Install

```sh
pnpm add @mcrovero/effect-nextjs effect next
```

2. Define a service and a middleware

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { Layer, Schema } from "effect"
import { Next, NextMiddleware } from "@mcrovero/effect-nextjs"

// A simple service
export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

// Middleware that provides CurrentUser and can fail with a string
export class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()("AuthMiddleware", {
  provides: CurrentUser,
  failure: Schema.String
}) {}

// Live implementation for the middleware
export const AuthLive = NextMiddleware.layer(AuthMiddleware, () => Effect.succeed({ id: "123", name: "Ada" }))

// Combine all lives you need
const AppLive = Layer.mergeAll(AuthLive)

// Create a typed page handler
export const Page = Next.make("BasePage", AppLive).middleware(AuthMiddleware)
```

3. Use it in a Next.js App Router file

```ts
// app/[id]/page.tsx
import { Page } from "@/lib/app" // wherever you defined it

const HomePage = Effect.fn("HomePage")(function* (props: {
  params: Promise<Record<string, string | undefined>>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { id } = yield* Next.decodeParams(Schema.Struct({ id: Schema.String }))(props)

  const user = yield* CurrentUser
  return (
    <div>
      Hello {user.name} (id: {id})
    </div>
  )
})

export default Page.build(HomePage)

// Or add other middlewares
export default Page.middleware(RandomMiddleware).build(HomePage)
```

Notes

- Use `Next.make(tag, layer)` for pages, layouts, server components, routes, and server actions.
- Parse/validate values inside your handler using helpers: `Next.decodeParams(...)` and `Next.decodeSearchParams(...)`
- You can add multiple middlewares with `.middleware(...)`. Middlewares can be marked `wrap` via the tag options to run before/after the handler.
- You can use this together with [`@mcrovero/effect-react-cache`](https://github.com/mcrovero/effect-react-cache) to cache `Effect`-based functions between pages, layouts, and components.

### Middlewares with dependencies

Use `NextMiddleware.layer(tag, impl)` to define a middleware with or without dependencies.

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { Layer, Schema } from "effect"
import { Next, NextMiddleware } from "@mcrovero/effect-nextjs"

// Dependencies
export class Other extends Context.Tag("Other")<Other, { id: string; name: string }>() {}
export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

// Auth requires `Other` to compute `CurrentUser`
export class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()("AuthMiddleware", {
  provides: CurrentUser,
  failure: Schema.String
}) {}

// Implementation reads from `Other` (its requirement is reflected in the Layer type)
const AuthLive = NextMiddleware.layer(AuthMiddleware, () =>
  Effect.gen(function* () {
    const other = yield* Other
    return { id: "123", name: other.name }
  })
)

// Provide the dependency
const OtherLive = Layer.succeed(Other, { id: "999", name: "Jane" })
const AppLive = Layer.mergeAll(OtherLive, AuthLive)

// Use in a page
const _home = Effect.fn("Home")(function* () {
  const user = yield* CurrentUser
  return user
})
const page = Next.make("Home", AppLive).middleware(AuthMiddleware).build(_home)
```

### Wrapped middlewares

Wrapped middlewares (`wrap: true`) receive a `next` Effect to run when they decide.

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

const WrappedLive = NextMiddleware.layer(Wrapped, ({ next }) =>
  Effect.gen(function* () {
    // pre logic...
    const out = yield* Effect.provideService(next, CurrentUser, { id: "u1", name: "Ada" })
    // post logic...
    return out
  })
)

const AppLive = Layer.mergeAll(WrappedLive)
const Page = Next.make("Home", AppLive).middleware(Wrapped)
```

### Parsing params, searchParams

Use `Schema` to validate/transform values explicitly inside your handler.

```ts
import { Schema } from "effect"
import { Next } from "@mcrovero/effect-nextjs"

// Params and searchParams (Page)
const HomePage = Effect.fn("Home")(function* (props: {
  params: Promise<Record<string, string | undefined>>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = yield* Next.decodeParams(Schema.Struct({ id: Schema.String }))(props)
  const searchParams = yield* Next.decodeSearchParams(Schema.Struct({ q: Schema.optional(Schema.String) }))(props)
  return { params, searchParams }
})

export default Next.make("Home", AppLive).build(HomePage)
```

### Routes (app/api)

`Next.make(tag, layer).build(handler)` is generic and works for route handlers too. Define your `GET`, `POST`, etc. by exporting the built function. The handler receives the same arguments you would pass to a Next.js route (e.g. `request: NextRequest`).

```ts
// app/api/time/route.ts
import * as Effect from "effect/Effect"
import { Layer } from "effect"
import * as Context from "effect/Context"
import { Next, NextMiddleware } from "@mcrovero/effect-nextjs"

const AppLive = Layer.mergeAll()

const _GET = Effect.fn("ServerTimeRoute")(function* () {
  const server = yield* ServerTime
  return { ok: true, now: server.now }
})
export const GET = Next.make("ServerTimeRoute", AppLive).middleware(TimeMiddleware).build(_GET)

// Similarly for POST/PUT/DELETE, export POST/PUT/DELETE with the same pattern.
```

### Server actions

Next.js requires every exported server action to be an async function at the export site. Use `Next.make(...).build(handler)` and keep the program definition separate from the export for better DX (type errors will surface at the export site without masking the handler body).

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { Layer } from "effect"
import { Next, NextMiddleware } from "@mcrovero/effect-nextjs"

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

export class Auth extends NextMiddleware.Tag<Auth>()("Auth", {
  provides: CurrentUser
}) {}

const AuthLive = NextMiddleware.layer(Auth, () => Effect.succeed({ id: "u1", name: "Ada" }))
const AppLive = Layer.mergeAll(AuthLive)

// Prepare a reusable builder (middlewares, runtime, etc.)
const UpdateNameAction = Next.make("UpdateName", AppLive).middleware(Auth)

// Define the Effect program separately (keeps types local to the program)
const _updateName = Effect.fn("updateName")((input: { name: string }) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser
    return { ok: true, name: input.name, by: user.id }
  })
)

// Exported server action: call .build(program)(input)
export const updateName = async (input: { name: string }) => UpdateNameAction.build(_updateName)(input)
```

This split keeps your handler body clean and debuggable while ensuring the export remains an async function as required by Next.js.

### Next.js Route Props Helpers Integration

With Next.js 15.5, you can now use the globally available `PageProps` and `LayoutProps` types for fully typed route parameters without manual definitions. You can use them with this library as follows:

```ts
import * as Effect from "effect/Effect"
import { Next } from "@mcrovero/effect-nextjs"

// Page with typed route parameters
const blogPage = Next.make("BlogPage", AppLive).build(
  Effect.fn("BlogHandler")(function* (props: PageProps<"/blog/[slug]">) {
    const { slug } = yield* Effect.promise(() => props.params)
    return (
      <article>
        <h1>Blog Post: {slug}</h1>
        <p>Content for {slug}</p>
      </article>
    )
  })
)

// Layout with parallel routes support
const dashboardLayout = Next.make("DashboardLayout", AppLive).build(
  Effect.fn("DashboardLayout")(function* (props: LayoutProps<"/dashboard">) {
    // Fully typed parallel route slots
    return (
      <div>
        {props.children}
        {props.analytics} {/* Fully typed */}
        {props.team} {/* Fully typed */}
      </div>
    )
  })
)
```

See the official documentation: - [Next.js 15.5 – Route Props Helpers](https://nextjs.org/docs/app/getting-started/layouts-and-pages#route-props-helpers)

### Why the new syntax?

#### Less Opinionated

In the previous version the library was adding too many layers of abstractions, and the scope was too broad. Now it is more focused on the core functionality, and less opinionated. For example in the previous version it was always decoding input from server actions, that, even though it is a good practice, it should not be responsibility of the library and it is now left to the user to decide how to parse the input, decode params/search params, etc. The library provides helpers to do so, but it is up to the user to decide how to use them.

#### Closer to Next.js APIs

With the newest Next.js 15.5 release, and the new `PageProps`/`LayoutProps` types, it is clear that the library should have dynamic props instead of pre-defined ones that we pre-process. This will make it easier to follow the Next.js updates and make the library more flexible.
For example in the previous version it was not possible to access parallel routes slots in layouts.

#### The Effect way

With the new architecture it also enables a more Effect-like way to build handlers. It is now possible to use `Effect.fn` directly inside the handler, delegating to the official ways to do tracing, logging, etc.
The only exception is server actions, because of the export requirements of Next.js that hopefully will be addressed in the future and the current .run and .runFn methods will be replaced by a single .build method like the other handlers.
