import { assert, describe, it } from "@effect/vitest"
import { Cause, Exit, Layer } from "effect"
import * as Effect from "effect/Effect"
import type { AsyncLocalStorage } from "node:async_hooks"
import { vi } from "vitest"
import * as Headers from "../src/Headers.js"
import * as Next from "../src/Next.js"

declare global {
  var __effect_nextjs_headers_request_context__: AsyncLocalStorage<{ requestId: string }>
}

const requestHelperState = {
  mutableCookies: false,
  throwApi: null as null | "headers" | "cookies" | "draftMode"
}

const headersContextError = new Error("headers() called outside a request scope")
const cookiesContextError = new Error("cookies() called outside a request scope")
const draftModeContextError = new Error("draftMode() called outside a request scope")

const getRequestContext = () =>
  globalThis.__effect_nextjs_headers_request_context__ as AsyncLocalStorage<{ requestId: string }>

const mockHeaders = {
  get: vi.fn((name: string) => {
    if (name === "x-request-id") {
      return getRequestContext().getStore()?.requestId ?? null
    }
    return `header:${name}`
  }),
  set: vi.fn(() => {
    throw new Error("Headers cannot be modified")
  })
}
const mockReadonlyCookies = {
  get: vi.fn((name: string) => ({ name, value: `cookie:${name}` })),
  set: vi.fn(() => {
    throw new Error("Cookies can only be modified in a Server Action or Route Handler")
  })
}
const mutableCookieJar = new Map<string, string>()
const mockMutableCookies = {
  get: vi.fn((name: string) => {
    const value = mutableCookieJar.get(name)
    return value === undefined ? undefined : { name, value }
  }),
  set: vi.fn((name: string, value: string) => {
    mutableCookieJar.set(name, value)
  })
}
const mockDraftMode = {
  isEnabled: true,
  enable: vi.fn(() => {
    mockDraftMode.isEnabled = true
  }),
  disable: vi.fn(() => {
    mockDraftMode.isEnabled = false
  })
}

vi.mock("next/headers.js", async () => {
  const { AsyncLocalStorage } = await import("node:async_hooks")
  globalThis.__effect_nextjs_headers_request_context__ = new AsyncLocalStorage<{ requestId: string }>() as never

  return {
    headers: () => {
      if (requestHelperState.throwApi === "headers") {
        throw headersContextError
      }
      return Promise.resolve(mockHeaders)
    },
    cookies: () => {
      if (requestHelperState.throwApi === "cookies") {
        throw cookiesContextError
      }
      return Promise.resolve(requestHelperState.mutableCookies ? mockMutableCookies : mockReadonlyCookies)
    },
    draftMode: () => {
      if (requestHelperState.throwApi === "draftMode") {
        throw draftModeContextError
      }
      return Promise.resolve(mockDraftMode)
    }
  }
})

describe("Headers", () => {
  it.effect("accesses Next request helpers directly inside the Effect runtime", () =>
    Effect.gen(function*() {
      requestHelperState.throwApi = null
      requestHelperState.mutableCookies = false
      mockDraftMode.isEnabled = true
      mutableCookieJar.clear()
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

  it.effect("preserves request helper semantics after awaiting them", () =>
    Effect.gen(function*() {
      requestHelperState.throwApi = null
      requestHelperState.mutableCookies = false
      mockDraftMode.isEnabled = true
      mutableCookieJar.clear()

      const readonlyHeaders = yield* Headers.Headers
      assert.throws(() => readonlyHeaders.set("x-test", "value"), /Headers cannot be modified/)

      const readonlyCookies = yield* Headers.Cookies
      assert.throws(
        () => readonlyCookies.set("session", "next"),
        /Cookies can only be modified in a Server Action or Route Handler/
      )

      requestHelperState.mutableCookies = true
      const mutableCookies = yield* Headers.Cookies
      mutableCookies.set("session", "updated")
      assert.deepStrictEqual(mutableCookies.get("session"), { name: "session", value: "updated" })

      const draftMode = yield* Headers.DraftMode
      draftMode.disable()
      assert.strictEqual(draftMode.isEnabled, false)
      draftMode.enable()
      assert.strictEqual(draftMode.isEnabled, true)
    }))

  it.effect("captures synchronous request-scope errors from Next helpers unchanged", () =>
    Effect.gen(function*() {
      requestHelperState.mutableCookies = false
      mockDraftMode.isEnabled = true

      requestHelperState.throwApi = "headers"
      const headersExit = yield* Headers.Headers.pipe(Effect.exit)
      assert.ok(Exit.isFailure(headersExit))
      assert.deepStrictEqual(headersExit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect), [
        headersContextError
      ])

      requestHelperState.throwApi = "cookies"
      const cookiesExit = yield* Headers.Cookies.pipe(Effect.exit)
      assert.ok(Exit.isFailure(cookiesExit))
      assert.deepStrictEqual(cookiesExit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect), [
        cookiesContextError
      ])

      requestHelperState.throwApi = "draftMode"
      const draftModeExit = yield* Headers.DraftMode.pipe(Effect.exit)
      assert.ok(Exit.isFailure(draftModeExit))
      assert.deepStrictEqual(draftModeExit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect), [
        draftModeContextError
      ])

      requestHelperState.throwApi = null
    }))

  it.effect("preserves AsyncLocalStorage context across concurrent requests", () =>
    Effect.gen(function*() {
      requestHelperState.throwApi = null
      requestHelperState.mutableCookies = false
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
