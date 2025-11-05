import { describe, expect, it, vi } from "vitest"
import * as AsyncContext from "../src/internal/async-context.js"

describe("AsyncContext", () => {
  describe("captureContext", () => {
    it("captures both workStore and workUnitStore when available", () => {
      const mockWorkStore = { route: "/test", incrementalCache: {} }
      const mockWorkUnitStore = { phase: "request" as const, type: "request" as const }

      const deps: AsyncContext.AsyncStorageDeps = {
        workAsyncStorage: {
          getStore: () => mockWorkStore
        } as any,
        workUnitAsyncStorage: {
          getStore: () => mockWorkUnitStore
        } as any
      }

      const context = AsyncContext.captureContext(deps)

      expect(context.workStore).toBe(mockWorkStore)
      expect(context.workUnitStore).toBe(mockWorkUnitStore)
    })

    it("captures undefined when stores are not available", () => {
      const deps: AsyncContext.AsyncStorageDeps = {
        workAsyncStorage: {
          getStore: () => undefined
        } as any,
        workUnitAsyncStorage: {
          getStore: () => undefined
        } as any
      }

      const context = AsyncContext.captureContext(deps)

      expect(context.workStore).toBeUndefined()
      expect(context.workUnitStore).toBeUndefined()
    })
  })

  describe("withRestoredContext", () => {
    it("restores both stores when both are available", () => {
      const mockWorkStore = { route: "/test" }
      const mockWorkUnitStore = { phase: "request" }
      const executionTrace: Array<string> = []

      const mockWorkAsyncStorage = {
        getStore: vi.fn(),
        run: vi.fn((store, fn) => {
          executionTrace.push(`workAsyncStorage.run with store ${store === mockWorkStore}`)
          return fn()
        })
      } as any

      const mockWorkUnitAsyncStorage = {
        getStore: vi.fn(),
        run: vi.fn((store, fn) => {
          executionTrace.push(`workUnitAsyncStorage.run with store ${store === mockWorkUnitStore}`)
          return fn()
        })
      } as any

      const context: AsyncContext.CapturedContext = {
        workStore: mockWorkStore,
        workUnitStore: mockWorkUnitStore
      }

      const deps: AsyncContext.AsyncStorageDeps = {
        workAsyncStorage: mockWorkAsyncStorage,
        workUnitAsyncStorage: mockWorkUnitAsyncStorage
      }

      const testFn = vi.fn((a: number, b: number) => {
        executionTrace.push("testFn executed")
        return a + b
      })

      const wrapped = AsyncContext.withRestoredContext(context, deps, testFn)
      const result = wrapped(1, 2)

      expect(result).toBe(3)
      expect(testFn).toHaveBeenCalledWith(1, 2)
      expect(mockWorkAsyncStorage.run).toHaveBeenCalledWith(mockWorkStore, expect.any(Function))
      expect(mockWorkUnitAsyncStorage.run).toHaveBeenCalledWith(mockWorkUnitStore, expect.any(Function))
      expect(executionTrace).toEqual([
        "workAsyncStorage.run with store true",
        "workUnitAsyncStorage.run with store true",
        "testFn executed"
      ])
    })

    it("restores only workStore when workUnitStore is undefined", () => {
      const mockWorkStore = { route: "/test" }
      const executionTrace: Array<string> = []

      const mockWorkAsyncStorage = {
        run: vi.fn((store, fn) => {
          executionTrace.push(`workAsyncStorage.run`)
          return fn()
        })
      } as any

      const mockWorkUnitAsyncStorage = {
        run: vi.fn()
      } as any

      const context: AsyncContext.CapturedContext = {
        workStore: mockWorkStore,
        workUnitStore: undefined
      }

      const deps: AsyncContext.AsyncStorageDeps = {
        workAsyncStorage: mockWorkAsyncStorage,
        workUnitAsyncStorage: mockWorkUnitAsyncStorage
      }

      const testFn = vi.fn(() => {
        executionTrace.push("testFn executed")
        return "result"
      })

      const wrapped = AsyncContext.withRestoredContext(context, deps, testFn)
      const result = wrapped()

      expect(result).toBe("result")
      expect(mockWorkAsyncStorage.run).toHaveBeenCalledWith(mockWorkStore, expect.any(Function))
      expect(mockWorkUnitAsyncStorage.run).not.toHaveBeenCalled()
      expect(executionTrace).toEqual(["workAsyncStorage.run", "testFn executed"])
    })

    it("calls function directly when no stores are available", () => {
      const mockWorkAsyncStorage = {
        run: vi.fn()
      } as any

      const mockWorkUnitAsyncStorage = {
        run: vi.fn()
      } as any

      const context: AsyncContext.CapturedContext = {
        workStore: undefined,
        workUnitStore: undefined
      }

      const deps: AsyncContext.AsyncStorageDeps = {
        workAsyncStorage: mockWorkAsyncStorage,
        workUnitAsyncStorage: mockWorkUnitAsyncStorage
      }

      const testFn = vi.fn(() => "direct result")

      const wrapped = AsyncContext.withRestoredContext(context, deps, testFn)
      const result = wrapped()

      expect(result).toBe("direct result")
      expect(mockWorkAsyncStorage.run).not.toHaveBeenCalled()
      expect(mockWorkUnitAsyncStorage.run).not.toHaveBeenCalled()
    })

    it("preserves function arguments and return values", () => {
      const context: AsyncContext.CapturedContext = {
        workStore: undefined,
        workUnitStore: undefined
      }

      const deps: AsyncContext.AsyncStorageDeps = {
        workAsyncStorage: { run: vi.fn() } as any,
        workUnitAsyncStorage: { run: vi.fn() } as any
      }

      const complexFn = (obj: { a: number }, arr: Array<string>, num: number) => {
        return { result: obj.a + arr.length + num }
      }

      const wrapped = AsyncContext.withRestoredContext(context, deps, complexFn)
      const result = wrapped({ a: 5 }, ["x", "y"], 3)

      expect(result).toEqual({ result: 10 })
    })

    it("handles functions that throw errors", () => {
      const mockWorkStore = { route: "/test" }

      const context: AsyncContext.CapturedContext = {
        workStore: mockWorkStore,
        workUnitStore: undefined
      }

      const deps: AsyncContext.AsyncStorageDeps = {
        workAsyncStorage: {
          run: (store: any, fn: () => any) => fn()
        } as any,
        workUnitAsyncStorage: { run: vi.fn() } as any
      }

      const throwingFn = () => {
        throw new Error("Test error")
      }

      const wrapped = AsyncContext.withRestoredContext(context, deps, throwingFn)

      expect(() => wrapped()).toThrow("Test error")
    })
  })
})
