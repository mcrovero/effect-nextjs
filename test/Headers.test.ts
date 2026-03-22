import { assert, describe, it } from "@effect/vitest"
import { Layer } from "effect"
import * as Effect from "effect/Effect"
import type { AsyncLocalStorage } from "node:async_hooks"
import { vi } from "vitest"
import * as Headers from "../src/Headers.js"
import * as Next from "../src/Next.js"

declare global {
  var __effect_nextjs_headers_request_context__: AsyncLocalStorage<{ requestId: string }>
}

const getRequestContext = () =>
  globalThis.__effect_nextjs_headers_request_context__ as AsyncLocalStorage<{ requestId: string }>

const mockHeaders = {
  get: vi.fn((name: string) => {
    if (name === "x-request-id") {
      return getRequestContext().getStore()?.requestId ?? null
    }
    return `header:${name}`
  })
}
const mockCookies = { get: vi.fn((name: string) => ({ name, value: `cookie:${name}` })) }
const mockDraftMode = { isEnabled: true }

vi.mock("next/headers.js", async () => {
  const { AsyncLocalStorage } = await import("node:async_hooks")
  globalThis.__effect_nextjs_headers_request_context__ = new AsyncLocalStorage<{ requestId: string }>() as never

  return {
    headers: () => Promise.resolve(mockHeaders),
    cookies: () => Promise.resolve(mockCookies),
    draftMode: () => Promise.resolve(mockDraftMode)
  }
})

describe("Headers", () => {
  it.effect("accesses Next request helpers directly inside the Effect runtime", () =>
    Effect.gen(function*() {
      const page = Next.make("HeadersTest", Layer.empty)

      const handler = Effect.gen(function*() {
        const requestHeaders = yield* Headers.Headers
        const requestCookies = yield* Headers.Cookies
        const draftMode = yield* Headers.DraftMode

        return {
          header: requestHeaders.get("x-test"),
          cookie: requestCookies.get("session")?.value,
          draftMode: draftMode.isEnabled
        }
      })

      const result = yield* Effect.promise(() => page.build(() => handler)())

      assert.deepStrictEqual(result, {
        header: "header:x-test",
        cookie: "cookie:session",
        draftMode: true
      })
    }))

  it.effect("preserves AsyncLocalStorage context across concurrent requests", () =>
    Effect.gen(function*() {
      const page = Next.make("HeadersAsyncLocalStorage", Layer.empty)
      const run = page.build(() =>
        Effect.gen(function*() {
          // Force a scheduler yield before reading the ALS-backed helper.
          yield* Effect.promise(() => Promise.resolve())
          const requestHeaders = yield* Headers.Headers
          return requestHeaders.get("x-request-id")
        })
      )

      const requestIds = Array.from({ length: 25 }, (_, index) => `request-${index}`)

      for (let round = 0; round < 10; round++) {
        const results = yield* Effect.promise(() =>
          Promise.all(
            requestIds.map((requestId) => getRequestContext().run({ requestId }, () => run()))
          )
        )

        assert.deepStrictEqual(results, requestIds)
      }
    }))
})
