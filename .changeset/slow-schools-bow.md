---
"@mcrovero/effect-nextjs": patch
---

Fix interrupt-only handler failures so they reject with a real error instead of `undefined`, and add a regression test for the public `Next.build` path.
