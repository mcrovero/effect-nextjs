import type * as ManagedRuntime from "effect/ManagedRuntime"

/**
 * Runtime Registry for Hot Module Replacement (HMR) and Singleton runtime support
 */
declare global {
  var __effect_nextjs_runtime_registry__:
    | Record<string, ManagedRuntime.ManagedRuntime<any, any> | undefined>
    | undefined
}

/**
 * Sets a runtime in the global registry
 */
export const setRuntime = (
  key: string,
  runtime: ManagedRuntime.ManagedRuntime<any, any>
): void => {
  const registry = (globalThis.__effect_nextjs_runtime_registry__ = globalThis.__effect_nextjs_runtime_registry__ ?? {})

  // Dispose of previous runtime if it exists to prevent memory leaks in dev
  const previous = registry[key]
  if (previous && typeof previous.dispose === "function" && process.env.NODE_ENV !== "production") {
    void previous.dispose()
  }

  registry[key] = runtime
}

/**
 * Gets a runtime from the global registry
 */
export const getRuntime = <T extends ManagedRuntime.ManagedRuntime<any, any>>(
  key: string,
  fallbackRuntime: T
): T => {
  const registry = globalThis.__effect_nextjs_runtime_registry__
  if (registry && registry[key]) {
    return registry[key] as T
  }

  return fallbackRuntime
}

process.on("SIGINT", () => {
  const registry = globalThis.__effect_nextjs_runtime_registry__
  if (registry) {
    Object.values(registry).forEach((runtime) => {
      void runtime?.dispose()
    })
  }
})

process.on("SIGTERM", () => {
  const registry = globalThis.__effect_nextjs_runtime_registry__
  if (registry) {
    Object.values(registry).forEach((runtime) => {
      void runtime?.dispose()
    })
  }
})
