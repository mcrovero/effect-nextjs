# Effect v4 prerelease

The `0.33.0-rc` line targets Effect v4. Keep applications on Effect v3 on
`@mcrovero/effect-nextjs@~0.32.0` with `effect >=3.20.0 <4`.
There is no runtime compatibility shim between the two majors.

The development baseline is Effect `4.0.0-rc.112` and Next.js `16.3.4`.
CI checks types, unit tests, and a production Next.js fixture against Next.js
`15.0.8`, `15.5.25`, and `16.3.4`. Next 15 compatibility is retained, but use
the latest patch release for deployed applications.

## Application changes

- Install `@mcrovero/effect-nextjs@rc` and `effect@4.0.0-rc.112` together.
- Replace `Context.Tag("User")<User, Shape>()` with
  `Context.Service<User, Shape>()("User")`.
- `Next.make`, `Next.makeWithRuntime`, `NextMiddleware.Tag`, and `.build`
  keep their library API. Their Effect, Layer, runtime, and schema arguments
  must now come from Effect v4.
- Replace `Effect.catchAll` with `Effect.catch`, and `Effect.catchAllCause`
  with `Effect.catchCause` in middleware implementations.
- Params helpers now use v4 schema decoding and fail with `SchemaError`,
  replacing `ParseError`. Schema decoding service requirements are preserved.
- Use `Schema.Union([a, b])` instead of `Schema.Union(a, b)`.
- Replace `ManagedRuntime.runtimeEffect` context extraction with
  `ManagedRuntime.contextEffect`. See the README for stateful service and
  telemetry examples using v4 APIs.
- `RevalidateTag(tag)` retains immediate expiration. On Next.js 16, a second
  argument accepts `"max"` or an expiration profile. Next.js 15 ignores it.

At the Promise boundary, single Error defects retain their identity, including
Next.js redirects, not-found errors, and rendering signals. The executor no
longer imports private Next.js error classifiers.

See the upstream [Effect migration guide](https://github.com/Effect-TS/effect/blob/main/MIGRATION.md)
for application APIs outside this library.

## Release policy

This is a breaking prerelease, not a v3-compatible patch. Publish it under the
`rc` npm tag while Effect v4 remains a release candidate; do not move `latest`
from the v3 release line yet. The package publish configuration selects `rc`.
Recheck the compatibility matrix when updating the pinned Effect prerelease.
