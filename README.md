# @mcrovero/effect-nextjs

Wrapper around Next.js App Router to build pages, layouts, server components, and server actions in the Effect world. Compose middlewares as `Context.Tag`s, validate params/search params/input with `Schema`, and build your `Effect` programs with a single call.

[![npm version](https://img.shields.io/npm/v/%40mcrovero%2Feffect-nextjs.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@mcrovero/effect-nextjs)
[![license: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

> [!WARNING]
> This library is in early alpha and is not ready for production use.
>
> ### Breaking changes (v0.10.0)
>
> This version changes the API to use the library, there is no longer a global Next.make(Layer) that exposes .page()/.layout()/.action()/.component() methods. You now need to use: NextPage.make("page_key", Layer), NextLayout.make("layout_key", Layer), etc.
> The keys must be unique across the same type of components.
> There are no more `.setParamsSchema(...)`, `.setSearchParamsSchema(...)`, and `.setInputSchema(...)`.
> You can now use the new helpers inside your handler:
>
> - `yield* Next.decodeParams(schema)(props)`
> - `yield* Next.decodeSearchParams(schema)(props)`
>
> The actions API has changed, there is no more .build() look at the examples for the new API.
>
> Read at the bottom of the README for more details on the decisions behind the new API.

### Why this library

- **End to end Effect**: You can bring effect gains up to the edge of your nextjs server.
- **Composable middlewares**: Add middlewares as `Context.Tag`s. Support for both provide-style and `wrap: true` middlewares, with typed `failure`/`catches`/`returns`.
- **Next.js control flow preserved**: `redirect`, `notFound` etc.. work correctly when thrown inside `Effect` programs (errors are mapped so Next.js handles them as expected).
- **Dev HMR safety**: In development, previous `ManagedRuntime`s are disposed on hot reload to prevent resource leaks.
- **Typed decoding helpers**: Opt-in helpers to parse `params` and `searchParams` using `Schema`.
- **Per-handler runtime**: Each page/layout/action/component runs on a `ManagedRuntime` built from your `Layer`.
- **Works with caching**: Pairs well with `@mcrovero/effect-react-cache` for cross-route Effect caching.

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
import { Next, NextPage, NextMiddleware } from "@mcrovero/effect-nextjs"

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
export const page = NextPage.make("BasePage", AppLive)
  .middleware(AuthMiddleware)
  .build(
    Effect.fn("HomePage")(function* (props: {
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
  )
```

3. Use it in a Next.js App Router file

```ts
// app/[id]/page.tsx
import { page } from "@/lib/app" // wherever you defined it

// Use it directly
export default page

// Or use it in a Next.js page (choose one default export)
export default async function Page(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}) {
  return await page({ params: props.params, searchParams: props.searchParams })
}
```

Notes

- Use `NextLayout.make(tag, layer)`, `NextServerComponent.make(tag, layer)`, and `NextAction.make(tag, layer)` for layouts, server components, and server actions.
- Parse/validate values inside your handler using helpers: `Next.decodeParams(...)` and `Next.decodeSearchParams(...)`
- You can add multiple middlewares with `.middleware(...)`. Middlewares can be marked `wrap` via the tag options to run before/after the handler.
- You can use this together with [`@mcrovero/effect-react-cache`](https://github.com/mcrovero/effect-react-cache) to cache `Effect`-based functions between pages, layouts, and components.

### Middlewares with dependencies

Use `NextMiddleware.layer(tag, impl)` when your middleware needs other services.

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { Layer, Schema } from "effect"
import { NextPage, NextMiddleware } from "@mcrovero/effect-nextjs"

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
const page = NextPage.make("Home", AppLive)
  .middleware(AuthMiddleware)
  .build(() =>
    Effect.gen(function* () {
      const user = yield* CurrentUser
      return user
    })
  )
```

### Wrapped middlewares

Wrapped middlewares (`wrap: true`) receive a `next` Effect to run when they decide.

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { Layer, Schema } from "effect"
import { NextPage, NextMiddleware } from "@mcrovero/effect-nextjs"

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
const page = NextPage.make("Home", AppLive)
  .middleware(Wrapped)
  .build(() => Effect.succeed("ok"))
```

### Parsing params, searchParams

Use `Schema` to validate/transform values explicitly inside your handler.

```ts
import { Schema } from "effect"
import { Next, NextPage, NextAction, NextServerComponent } from "@mcrovero/effect-nextjs"

// Params and searchParams (Page)
const page = NextPage.make("Home", AppLive).build(
  Effect.fn("Home")(function* (props: {
    params: Promise<Record<string, string | undefined>>
    searchParams: Promise<Record<string, string | undefined>>
  }) {
    const params = yield* Next.decodeParams(Schema.Struct({ id: Schema.String }))(props)
    const searchParams = yield* Next.decodeSearchParams(Schema.Struct({ q: Schema.optional(Schema.String) }))(props)
    return { params, searchParams }
  })
)
```

### Server actions

Next.js requires every exported server action to be an async function at the export site. Because of this, actions are handled slightly differently than pages, layouts and server components.

Use `NextAction.make(...).run(...)` or `NextAction.make(...).runFn(...)` inside an async exported function. Both return a Promise of the result.

- **run**: executes without creating a tracing span; returns a Promise.
- **runFn**: executes with a named tracing span (similar to `Effect.fn`); returns a Promise.

Basic example:

```ts
import * as Effect from "effect/Effect"
import { Layer } from "effect"
import * as Context from "effect/Context"
import { NextAction, NextMiddleware } from "@mcrovero/effect-nextjs"

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

export class Auth extends NextMiddleware.Tag<Auth>()("Auth", {
  provides: CurrentUser
}) {}

const AuthLive = NextMiddleware.layer(Auth, () => Effect.succeed({ id: "u1", name: "Ada" }))
const AppLive = Layer.mergeAll(AuthLive)

// Export an async server action
export const action = async (input: Input) =>
  NextAction.make("UpdateName", AppLive)
    .middleware(Auth)
    .run(
      Effect.gen(function* () {
        const user = yield* CurrentUser
        return { ok: true, user }
      })
    )

// With inputs and tracing span
type Input = { name: string }
export const updateName = async (input: Input) =>
  NextAction.make("UpdateNameWithSpan", AppLive)
    .middleware(Auth)
    .runFn(
      "UpdateName",
      Effect.gen(function* () {
        const user = yield* CurrentUser
        return { ok: true, name: input.name, by: user.id }
      })
    )
```

Using `Effect.fn` with actions

`Effect.fn` also works with actions, it is just more boilerplate to write it manually:

```ts
type Input = { test: string }
const effect = Effect.fn("ExampleAction")(function* (props: Input) {
  const user = yield* CurrentUser
  return { user, parsed: props.test }
})
export const actionWithFn = async (input: Input) =>
  NextAction.make("ExampleWithFn", AppLive).middleware(Auth).run(effect(input))
```

### Next.js Route Props Helpers Integration

With Next.js 15.5, you can now use the globally available `PageProps` and `LayoutProps` types for fully typed route parameters without manual definitions. You can use them with this library as follows:

```ts
import * as Effect from "effect/Effect"
import { NextPage, NextLayout } from "@mcrovero/effect-nextjs"

// Page with typed route parameters
const blogPage = NextPage.make("BlogPage", AppLive).build(
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
const dashboardLayout = NextLayout.make("DashboardLayout", AppLive).build(
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
