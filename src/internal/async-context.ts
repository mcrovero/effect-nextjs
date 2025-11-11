/**
 * Utilities for capturing and restoring Next.js AsyncLocalStorage context.
 * This allows Effect runtime to maintain access to Next.js internal state
 * (workAsyncStorage, workUnitAsyncStorage) when calling Next.js functions.
 *
 * @since 0.31.0
 * @internal
 */

import * as Context_ from "effect/Context"
import type { AsyncLocalStorage as AsyncLocalStorageType } from "node:async_hooks"

/**
 * Represents captured AsyncLocalStorage context from Next.js.
 * @internal
 */
export interface CapturedContext {
  readonly workStore: unknown
  readonly workUnitStore: unknown
}

/**
 * Dependencies for AsyncLocalStorage operations.
 * Allows for dependency injection and easier testing.
 * @internal
 */
export interface AsyncStorageDeps {
  readonly workAsyncStorage: AsyncLocalStorageType<any>
  readonly workUnitAsyncStorage: AsyncLocalStorageType<any>
}

/**
 * Captures the current AsyncLocalStorage context from Next.js.
 * This should be called at the boundary where we enter the Effect runtime.
 *
 * @internal
 */
export const captureContext = (deps: AsyncStorageDeps): CapturedContext => ({
  workStore: deps.workAsyncStorage.getStore(),
  workUnitStore: deps.workUnitAsyncStorage.getStore()
})

/**
 * Creates a function wrapper that restores AsyncLocalStorage context before execution.
 * This allows functions that depend on Next.js AsyncLocalStorage to work correctly
 * when called from within the Effect runtime.
 *
 * @internal
 */
export const withRestoredContext = <Args extends ReadonlyArray<unknown>, R>(
  context: CapturedContext,
  deps: AsyncStorageDeps,
  fn: (...args: Args) => R
): (...args: Args) => R => {
  return (...args: Args): R => {
    const { workStore, workUnitStore } = context
    const { workAsyncStorage, workUnitAsyncStorage } = deps

    // Restore both stores if available
    if (workStore !== undefined && workUnitStore !== undefined) {
      return workAsyncStorage.run(workStore, () => workUnitAsyncStorage.run(workUnitStore, () => fn(...args)))
    }

    // Restore only workStore if workUnitStore is not available
    if (workStore !== undefined) {
      return workAsyncStorage.run(workStore, () => fn(...args))
    }

    // If no context is available, call directly
    // This shouldn't happen in normal Next.js flow but provides a fallback
    return fn(...args)
  }
}

/**
 * Creates a reusable wrapper factory that can wrap any function with the captured context.
 * This avoids passing the same context and deps repeatedly.
 *
 * @internal
 */
export const createContextWrapper = (
  context: CapturedContext,
  deps: AsyncStorageDeps
) => {
  return <Args extends ReadonlyArray<unknown>, R>(
    fn: (...args: Args) => R
  ): (...args: Args) => R => {
    return withRestoredContext(context, deps, fn)
  }
}

/**
 * Type for the context wrapper function.
 * @internal
 */
export type ContextWrapper = ReturnType<typeof createContextWrapper>

/**
 * Service tag for the context wrapper.
 * Allows functions to wrap themselves with AsyncLocalStorage context.
 *
 * @since 0.31.0
 * @internal
 */
export class ContextWrapperService extends Context_.Tag("ContextWrapperService")<
  ContextWrapperService,
  ContextWrapper
>() {}
