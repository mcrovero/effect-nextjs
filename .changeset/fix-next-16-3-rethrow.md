---
"@mcrovero/effect-nextjs": patch
---

Import `unstable_rethrow` from the public `next/navigation` entrypoint instead of the internal `next/dist/client/components/unstable-rethrow.server.js` path. That internal module was removed in Next.js 16.3, which made `next build` fail with `Module not found: Can't resolve 'next/dist/client/components/unstable-rethrow.server.js'` for any app using the library. `unstable_rethrow` has been exported from `next/navigation` since Next.js 15, so this keeps working across the whole supported `^15 || ^16` range.
