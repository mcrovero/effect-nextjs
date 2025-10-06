---
"@mcrovero/effect-nextjs": minor
---

- feat: Add option to pass a `ManagedRuntime` directly to `Next.make(tag, runtime)`, in addition to the existing `Layer` overload.
  - When a runtime is provided explicitly, it is used as-is and is not registered in the HMR runtime registry; lifecycle is user-managed.
- breaking: Remove `NextMiddleware.layer` utility.
