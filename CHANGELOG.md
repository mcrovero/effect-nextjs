# @mcrovero/effect-nextjs

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
