import type * as ManagedRuntime from "effect/ManagedRuntime"

/**
 * Runtime Registry for Hot Module Replacement (HMR) Support
 *
 * This utility is essential for supporting Hot Module Replacement in development environments.
 * Without it, HMR would break Effect-based Next.js applications due to runtime lifecycle issues.
 *
 * Usage:
 * - setRuntime(tag, runtime): Store runtime in registry (dev) or noop (prod)
 * - getRuntime(tag, fallback): Get runtime from registry (dev) or return fallback (prod)
 *
 * This ensures HMR works seamlessly while maintaining performance in production.
 */
declare global {
  var __effect_nextjs_runtime_registry__:
    | Record<string, ManagedRuntime.ManagedRuntime<any, any> | undefined>
    | undefined
}

/**
 * Sets a runtime in the global registry for development mode.
 * In production, this is a no-op.
 *
 * @param runtimeTag - The tag to identify the runtime
 * @param runtime - The runtime to register
 */
export const setRuntime = (
  key: string,
  runtime: ManagedRuntime.ManagedRuntime<any, any>
): void => {
  const isDev = process.env.NODE_ENV !== "production"
  if (!isDev) return

  const registry = (globalThis.__effect_nextjs_runtime_registry__ = globalThis.__effect_nextjs_runtime_registry__ ?? {})

  // Dispose of previous runtime if it exists to prevent memory leaks
  const previous = registry[key]
  if (previous && typeof previous.dispose === "function") {
    // fire-and-forget: ensure previous scoped resources/fibers are finalized
    void previous.dispose()
  }

  registry[key] = runtime
}

/**
 * Gets a runtime from the global registry for development mode.
 * In production or if no runtime is found in the registry, returns the provided fallback runtime.
 *
 * @param key - The key to identify the runtime
 * @param fallbackRuntime - The runtime to use as fallback
 * @returns The runtime from registry (dev) or the fallback runtime (prod/no registry)
 */
export const getRuntime = <T extends ManagedRuntime.ManagedRuntime<any, any>>(
  key: string,
  fallbackRuntime: T
): T => {
  const isDev = process.env.NODE_ENV !== "production"
  if (!isDev) return fallbackRuntime

  const registry = globalThis.__effect_nextjs_runtime_registry__
  if (registry && registry[key]) {
    return registry[key] as T
  }

  return fallbackRuntime
}
