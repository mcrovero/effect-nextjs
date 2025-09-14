/**
 * Sets a runtime in the global registry for development mode.
 * In production, this is a no-op.
 *
 * @param runtimeTag - The tag to identify the runtime
 * @param runtime - The runtime to register
 */
export const setRuntime = (key, runtime) => {
    const isDev = process.env.NODE_ENV !== "production";
    if (!isDev)
        return;
    const registry = (globalThis.__effect_nextjs_runtime_registry__ = globalThis.__effect_nextjs_runtime_registry__ ?? {});
    // Dispose of previous runtime if it exists to prevent memory leaks
    const previous = registry[key];
    if (previous && typeof previous.dispose === "function") {
        // fire-and-forget: ensure previous scoped resources/fibers are finalized
        void previous.dispose();
    }
    registry[key] = runtime;
};
/**
 * Gets a runtime from the global registry for development mode.
 * In production or if no runtime is found in the registry, returns the provided fallback runtime.
 *
 * @param key - The key to identify the runtime
 * @param fallbackRuntime - The runtime to use as fallback
 * @returns The runtime from registry (dev) or the fallback runtime (prod/no registry)
 */
export const getRuntime = (key, fallbackRuntime) => {
    const isDev = process.env.NODE_ENV !== "production";
    if (!isDev)
        return fallbackRuntime;
    const registry = globalThis.__effect_nextjs_runtime_registry__;
    if (registry && registry[key]) {
        return registry[key];
    }
    return fallbackRuntime;
};
