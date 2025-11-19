---
"@mcrovero/effect-nextjs": minor
---

Added support for AsyncLocalStorage from Next.js to properly capture and restore context for cache revalidation. The library now imports `workAsyncStorage` and `workUnitAsyncStorage` from Next.js internal modules and uses them to maintain context across async boundaries, ensuring proper cache revalidation behavior.
