---
"@mcrovero/effect-nextjs": minor
---

- Add props-aware overloads to `NextServerComponent.build` so components can accept typed props and return a callable with matching parameter types.
- Forward `props` at runtime and preserve middleware chaining and error mapping.
- Update `example/ServerComponent.ts` to demonstrate the new API and adjust `README.md` with usage notes and examples for both props and no-props cases.
