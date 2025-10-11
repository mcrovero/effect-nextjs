---
"@mcrovero/effect-nextjs": minor
---

Now nextjs is a peer dependency to be able to use the unstable_throw and better handle the control flow.
Now the runtimes are set in the global registry in production too. Added SIGTERM and SIGINT handlers to dispose of the runtimes.
