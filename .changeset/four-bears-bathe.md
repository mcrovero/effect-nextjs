---
"@mcrovero/effect-nextjs": minor
---

Require `effect >= 3.20.0` and remove the manual Next.js `AsyncLocalStorage` capture/restore workaround. Request helpers and cache revalidation now rely on Effect's patched async context propagation instead of restoring Next internals explicitly.
