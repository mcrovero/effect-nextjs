---
"@mcrovero/effect-nextjs": minor
---

This version changes the API to use the library, there is no longer a global Next.make(Layer) that exposes .page()/.layout()/.action()/.component() methods. You now need to use: NextPage.make("page_key", Layer), NextLayout.make("layout_key", Layer), etc.
The keys must be unique across the same type of components.
There are no more `.setParamsSchema(...)`, `.setSearchParamsSchema(...)`, and `.setInputSchema(...)`.
You can now use the new helpers inside your handler:

- `yield* Next.decodeParams(schema)(props)`
- `yield* Next.decodeSearchParams(schema)(props)`

The actions API has changed, there is no more .build() look at the examples for the new API but .run() waiting to unify the API with the other handlers.

Read at the bottom of the README for more details for the decisions behind the new API.
