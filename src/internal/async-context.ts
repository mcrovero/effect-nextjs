import * as Context_ from "effect/Context"
import type { AsyncLocalStorage as AsyncLocalStorageType } from "node:async_hooks"

export interface CapturedContext {
  readonly workStore: unknown
  readonly workUnitStore: unknown
}

export interface AsyncStorageDeps {
  readonly workAsyncStorage: AsyncLocalStorageType<any>
  readonly workUnitAsyncStorage: AsyncLocalStorageType<any>
}

/**
 * @since 0.5.0
 * @category utils
 */
export const captureContext = (deps: AsyncStorageDeps): CapturedContext => ({
  workStore: deps.workAsyncStorage.getStore(),
  workUnitStore: deps.workUnitAsyncStorage.getStore()
})

export const withRestoredContext = <Args extends ReadonlyArray<unknown>, R>(
  context: CapturedContext,
  deps: AsyncStorageDeps,
  fn: (...args: Args) => R
): (...args: Args) => R => {
  return (...args: Args): R => {
    const { workStore, workUnitStore } = context
    const { workAsyncStorage, workUnitAsyncStorage } = deps

    if (workStore !== undefined && workUnitStore !== undefined) {
      return workAsyncStorage.run(workStore, () => workUnitAsyncStorage.run(workUnitStore, () => fn(...args)))
    }

    if (workStore !== undefined) {
      return workAsyncStorage.run(workStore, () => fn(...args))
    }

    return fn(...args)
  }
}

/**
 * @since 0.31.0
 * @category utils
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

export type ContextWrapper = ReturnType<typeof createContextWrapper>

/**
 * @since 0.31.0
 * @category utils
 */
export class ContextWrapperService extends Context_.Tag("ContextWrapperService")<
  ContextWrapperService,
  ContextWrapper
>() {}
