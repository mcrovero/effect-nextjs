# @mcrovero/effect-nextjs

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
