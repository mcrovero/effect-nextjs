# @mcrovero/effect-nextjs

## 0.32.0

### Minor Changes

- [`e041aa4`](https://github.com/mcrovero/effect-nextjs/commit/e041aa4c2b1668fbd1bced9c9349b1d0fafba7c7) Thanks @mcrovero! - Require `effect >= 3.20.0` and remove the manual Next.js `AsyncLocalStorage` capture/restore workaround. Request helpers and cache revalidation now rely on Effect's patched async context propagation instead of restoring Next internals explicitly.

### Patch Changes

- [#57](https://github.com/mcrovero/effect-nextjs/pull/57) [`c53a8a2`](https://github.com/mcrovero/effect-nextjs/commit/c53a8a298dcb44ac6cef8e8d75ef132ea4367557) Thanks @mcrovero! - Clarify the Next.js request-helper contract in the docs and add regression coverage for readonly headers, cookie mutability, draft mode helpers, and synchronous request-scope errors. Also document that the cache facade currently mirrors the stable cache helpers covered by the repo's tested Next 15.5 setup.

- [#56](https://github.com/mcrovero/effect-nextjs/pull/56) [`1fce6e4`](https://github.com/mcrovero/effect-nextjs/commit/1fce6e4e9f8f6b90afb475745ab9c49fd0d25950) Thanks @mcrovero! - Add a real Next.js integration test fixture that exercises the built package in an App Router app, covering request helpers, middleware-provided context, redirects, notFound handling, and route-handler cookie behavior.

- [#54](https://github.com/mcrovero/effect-nextjs/pull/54) [`24b167b`](https://github.com/mcrovero/effect-nextjs/commit/24b167b3a8a91139129993c559e8b1967c7303e9) Thanks @mcrovero! - Fix interrupt-only handler failures so they reject with a real error instead of `undefined`, and add a regression test for the public `Next.build` path.

## 0.31.1

### Patch Changes

- [`8eb214a`](https://github.com/mcrovero/effect-nextjs/commit/8eb214a338736949052ffa6deecedd35067bfead) Thanks @mcrovero! - bump deps and fix makeWithRuntime type signature

## 0.31.0

### Minor Changes

- [#46](https://github.com/mcrovero/effect-nextjs/pull/46) [`86f98cd`](https://github.com/mcrovero/effect-nextjs/commit/86f98cdd8b264758e62a45f3403c276cd4e85228) Thanks @mcrovero! - Added support for AsyncLocalStorage from Next.js to properly capture and restore context for cache revalidation. The library now imports `workAsyncStorage` and `workUnitAsyncStorage` from Next.js internal modules and uses them to maintain context across async boundaries, ensuring proper cache revalidation behavior.

## 0.30.0

### Minor Changes

- [#44](https://github.com/mcrovero/effect-nextjs/pull/44) [`66b4496`](https://github.com/mcrovero/effect-nextjs/commit/66b4496e3b12160025f1cc71b7d1e8bc30f287fc) Thanks @mcrovero! - Now Nextjs is a peer dependency to be able to use the unstable_throw and effect versions of the Nextjs control-flow redirect, notFound etc.
  Removed runtime registry and related options, you should now only pass stateless Services to Next.

## 0.21.0

### Minor Changes

- [#42](https://github.com/mcrovero/effect-nextjs/pull/42) [`8af5aa5`](https://github.com/mcrovero/effect-nextjs/commit/8af5aa54944cc7857270c303cef50ae7e3ae110a) Thanks @mcrovero! - - feat: Add option to pass a `ManagedRuntime` using `Next.makeWithRuntime(tag, runtime)`, in addition to the existing `Next.make(tag, layer)`.
  - When a runtime is provided explicitly, it is used as-is and is not registered in the HMR runtime registry; lifecycle is user-managed.
  - breaking: Remove `NextMiddleware.layer` utility.

## 0.20.0

### Minor Changes

- [#38](https://github.com/mcrovero/effect-nextjs/pull/38) [`b1860e7`](https://github.com/mcrovero/effect-nextjs/commit/b1860e77c6d849a6cd5f4729d9dc028864094835) Thanks @mcrovero! - ! Breaking: Deprecating NextAction and removed utils to decode params and search params

## 0.12.0

### Minor Changes

- [#36](https://github.com/mcrovero/effect-nextjs/pull/36) [`d6d7633`](https://github.com/mcrovero/effect-nextjs/commit/d6d76333fa912eae137b4944fa1d4a1473c2d6fb) Thanks @mcrovero! - Added support for Next.js routes. Now Next accepts a list of arguments and middlewares receive props from calling component

## 0.11.0

### Minor Changes

- [#34](https://github.com/mcrovero/effect-nextjs/pull/34) [`04322b2`](https://github.com/mcrovero/effect-nextjs/commit/04322b25390e1df73721b0de4e7a24fae5126b83) Thanks @mcrovero! - Moved to a single builder for Pages, Layouts and Server components

## 0.10.0

### Minor Changes

- [#32](https://github.com/mcrovero/effect-nextjs/pull/32) [`e40f93c`](https://github.com/mcrovero/effect-nextjs/commit/e40f93ccad6143dd734ea3b4b620727e98db384e) Thanks @mcrovero! - This version changes the API to use the library, there is no longer a global Next.make(Layer) that exposes .page()/.layout()/.action()/.component() methods. You now need to use: NextPage.make("page_key", Layer), NextLayout.make("layout_key", Layer), etc.
  The keys must be unique across the same type of components.
  There are no more `.setParamsSchema(...)`, `.setSearchParamsSchema(...)`, and `.setInputSchema(...)`.
  You can now use the new helpers inside your handler:

  - `yield* Next.decodeParams(schema)(props)`
  - `yield* Next.decodeSearchParams(schema)(props)`

  The actions API has changed, there is no more .build() look at the examples for the new API but .run() waiting to unify the API with the other handlers.

  Read at the bottom of the README for more details for the decisions behind the new API.

## 0.6.0

### Minor Changes

- [`024bdc0`](https://github.com/mcrovero/effect-nextjs/commit/024bdc03682591d527f2c104cc67f48819cbfd8d) Thanks @mcrovero! - Now uses ManagedRuntime to prevent layers from being provided multiple times

## 0.5.0

### Minor Changes

- [`f64d06a`](https://github.com/mcrovero/effect-nextjs/commit/f64d06a9e34ef287c30501473bd2db2fad03b037) Thanks @mcrovero! - Added automatic trace spans and effect stacktrace

## 0.4.1

### Patch Changes

- [`6f27463`](https://github.com/mcrovero/effect-nextjs/commit/6f27463e2ebf9e8a581e4a2fafa6ec7a20b11b3a) Thanks @mcrovero! - moved deps to peer dependencies

## 0.4.0

### Minor Changes

- [`7b795a7`](https://github.com/mcrovero/effect-nextjs/commit/7b795a7367251477a76e42538ba172f9c8ebad62) Thanks @mcrovero! - Removed optional middlewares and added catches/returns in wrap middlewares

## 0.3.0

### Minor Changes

- [`256f09a`](https://github.com/mcrovero/effect-nextjs/commit/256f09a4d7d5cd6d57faf30819016a1c172690ae) Thanks @mcrovero! - breaking: removed onError and improved error management

## 0.2.0

### Minor Changes

- [#19](https://github.com/mcrovero/effect-nextjs/pull/19) [`4468531`](https://github.com/mcrovero/effect-nextjs/commit/4468531eeb5aeaea403d400bed0ac6f09b492b84) Thanks @mcrovero! - - Add props-aware overloads to `NextServerComponent.build` so components can accept typed props and return a callable with matching parameter types.
  - Forward `props` at runtime and preserve middleware chaining and error mapping.
  - Update `example/ServerComponent.ts` to demonstrate the new API and adjust `README.md` with usage notes and examples for both props and no-props cases.

## 0.1.4

### Patch Changes

- [#15](https://github.com/mcrovero/effect-nextjs/pull/15) [`4d03690`](https://github.com/mcrovero/effect-nextjs/commit/4d03690e6a9918f15c7633cbde6c1d2548f84ed4) Thanks @mcrovero! - Fix encoded/decoded type actions

## 0.1.3

### Patch Changes

- [`4a20402`](https://github.com/mcrovero/effect-nextjs/commit/4a20402088c3ca6cb44119f68bb07599f91a288d) Thanks @mcrovero! - Fixed symbol page

## 0.1.2

### Patch Changes

- [`40be3b1`](https://github.com/mcrovero/effect-nextjs/commit/40be3b1edc6e0d621485c3efae6b4932024fefef) Thanks @mcrovero! - fix type searchparams and params

## 0.1.1

### Patch Changes

- [`0a9f733`](https://github.com/mcrovero/effect-nextjs/commit/0a9f73343003f3f725a3c922b2bf3aceb165bb1f) Thanks @mcrovero! - Unify parameter handling across Layout, Page, and Middleware

## 0.1.0

### Minor Changes

- [#10](https://github.com/mcrovero/effect-nextjs/pull/10) [`755ff4a`](https://github.com/mcrovero/effect-nextjs/commit/755ff4a73f1f5e44cf20ffd3802aee976ad60522) Thanks @mcrovero! - Now params and search params are passed as raw values and then it has been added parsedSearchParams and parsedParams that return effects

## 0.0.3

### Patch Changes

- [`5a57ce4`](https://github.com/mcrovero/effect-nextjs/commit/5a57ce431f6abc6854428ebc6b5c6757f6fc65c5) Thanks @mcrovero! - Added github repository

## 0.0.2

### Patch Changes

- [#7](https://github.com/mcrovero/effect-nextjs/pull/7) [`e72537e`](https://github.com/mcrovero/effect-nextjs/commit/e72537e0e2e3d0ebc0ebf61055aa3c703612a5dc) Thanks @mcrovero! - alpha version
