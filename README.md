# @mcrovero/effect-nextjs

[![npm version](https://img.shields.io/npm/v/%40mcrovero%2Feffect-nextjs.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@mcrovero/effect-nextjs)
[![license: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

> [!WARNING]
> This library is in early alpha and is not ready for production use.

Typed helpers to build Next.js App Router pages, layouts, server components, and server actions with Effect. Compose middlewares as `Context.Tag`s, validate params/search params/input with `Schema`, and build your `Effect` programs with a single call.

### Getting Started

1. Install

```sh
pnpm add @mcrovero/effect-nextjs effect next
```

2. Define a service and a middleware

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { Next, NextMiddleware } from "@mcrovero/effect-nextjs"

// A simple service
export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}

// Middleware that provides CurrentUser and can fail with a string
export class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()("AuthMiddleware", {
  provides: CurrentUser,
  failure: Schema.String
}) {}

// Live implementation for the middleware (typed R is inferred)
export const AuthLive = NextMiddleware.layer(AuthMiddleware, () => Effect.succeed({ id: "123", name: "Ada" }))

// Combine all lives you need
const AppLive = Layer.mergeAll(AuthLive)

// Create a typed page handler
export const page = Next.make(AppLive)
  .page("HomePage")
  .setParamsSchema(Schema.Struct({ id: Schema.String }))
  .middleware(AuthMiddleware)
  .build(({ params }) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser
      return <div>Hello {user.name}</div>
    })
  )
```

3. Use it in a Next.js App Router file

```ts
// app/[id]/page.tsx
import { page } from "@/lib/app" // wherever you defined it

// Use it directly
export default page

// Or use it in a Next.js page
export default async function Page(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const data = await page({ params: props.params, searchParams: props.searchParams })
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

Notes

- Use `.layout(tag)`, `.component(tag)`, and `.action(tag)` for layouts, server components, and server actions.
- Validate search params with `.setSearchParamsSchema(...)` on pages, and action input with `.setInputSchema(...)` on actions.
- Add multiple middlewares with `.middleware(...)`. Middlewares can be marked `optional` or `wrap` via the tag options.
- Provide a custom error mapping with `.build(handler, onError)`.
- Server actions: due to Next.js restrictions, the action handler must be declared with the `async` keyword. In this API, that means the function you pass to `.build(...)` for actions must be `async`, returning a Promise of an Effect.
- You can use this together with [`@mcrovero/effect-react-cache`](https://github.com/mcrovero/effect-react-cache) to cache `Effect`-based functions between pages, layouts, and components.

### Middlewares with dependencies

Use `NextMiddleware.layer(tag, impl)` when your middleware needs other services. The layer will carry the implementation's environment in its `R` type so you can compose it safely.

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
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
const page = Next.make(AppLive)
  .page("Home")
  .middleware(AuthMiddleware)
  .build(() =>
    Effect.gen(function* () {
      const user = yield* CurrentUser
      return user
    })
  )
```

### Using services (Tags) in handlers

Access provided services with `yield* Tag` inside your `Effect` handler.

```ts
const page = Next.make(AppLive)
  .page("Home")
  .middleware(AuthMiddleware)
  .build(() =>
    Effect.gen(function* () {
      const user = yield* CurrentUser
      // use `user` here
      return user
    })
  )
```

### Wrapped middlewares

Wrapped middlewares (`wrap: true`) receive a `next` Effect to run when they decide. They can short-circuit, run before/after, and still provide services.

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
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
      // pre logic...
      const out = yield* Effect.provideService(next, CurrentUser, { id: "u1", name: "Ada" })
      // post logic...
      return out
    })
  )
)

const AppLive = Layer.mergeAll(WrappedLive)
const page = Next.make(AppLive)
  .page("Home")
  .middleware(Wrapped)
  .build(() => Effect.succeed("ok"))
```

### OpenTelemetry integration (example)

You can wrap your Effect boundary with an OpenTelemetry span bridged from the currently active OTel span:

```ts
import { makeExternalSpan } from "@effect/opentelemetry/Tracer"
import { trace } from "@opentelemetry/api"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { NextMiddleware } from "@mcrovero/effect-nextjs"

export class OtelSpanMiddleware extends NextMiddleware.Tag<OtelSpanMiddleware>()("OtelSpanMiddleware", {
  wrap: true
}) {}

export const OtelSpanLive = Layer.succeed(
  OtelSpanMiddleware,
  OtelSpanMiddleware.of(({ next }) =>
    Effect.sync(() => trace.getActiveSpan()).pipe(
      Effect.flatMap((active) => {
        if (!active) return next
        return Effect.withSpan(next, "EffectBoundary", {
          parent: makeExternalSpan(active.spanContext())
        })
      })
    )
  )
)
```

### Parsing params, searchParams and input

Use `Schema` to validate/transform values automatically before your handler runs.

```ts
import * as Schema from "effect/Schema"
import { Next } from "@mcrovero/effect-nextjs"

// Params and searchParams (Page)
const page = Next.make(AppLive)
  .page("Home")
  .setParamsSchema(Schema.Struct({ id: Schema.String }))
  .setSearchParamsSchema(Schema.Struct({ q: Schema.optional(Schema.String) }))
  .build(({ params, searchParams }) => Effect.succeed({ params, searchParams }))

// Input (Action)
// IMPORTANT: The action handler must be async because of Next.js server action requirements
const action = Next.make(AppLive)
  .action("DoSomething")
  .setInputSchema(Schema.Struct({ count: Schema.Number, tags: Schema.Array(Schema.String) }))
  .build(async ({ input }) => Effect.succeed({ ok: true, input }))

// Server Component (no inputs):
const component = Next.make(AppLive)
  .component("ServerInfo")
  .build(() => Effect.succeed({ ok: true }))
```

### Running Code

This repo uses [tsx](https://tsx.is) to execute TypeScript files via NodeJS.

```sh
pnpm tsx ./path/to/the/file.ts
```

### Operations

- **Build**

```sh
pnpm build
```

- **Test**

```sh
pnpm test
```
