---
"@mcrovero/effect-nextjs": minor
---

- feat: Add option to pass a `ManagedRuntime` using `Next.makeWithRuntime(tag, runtime)`, in addition to the existing `Next.make(tag, layer)`.
  - When a runtime is provided explicitly, it is used as-is and is not registered in the HMR runtime registry; lifecycle is user-managed.
- breaking: Remove `NextMiddleware.layer` utility.
