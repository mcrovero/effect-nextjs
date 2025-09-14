import { Cause, Effect, Exit } from "effect";
/**
 * @since 0.5.0
 * @category utils
 */
export const executeWithRuntime = async (runtime, effect) => {
    const result = runtime
        ? await runtime.runPromiseExit(effect)
        : await Effect.runPromiseExit(effect);
    if (Exit.isFailure(result)) {
        const mappedError = Cause.match(result.cause, {
            onEmpty: () => new Error("empty"),
            onFail: (error_1) => error_1,
            onDie: (defect_1) => defect_1,
            onInterrupt: (fiberId_1) => new Error(`Interrupted`, { cause: fiberId_1 }),
            onSequential: (left_1, right) => new Error(`Sequential (left: ${left_1}) (right: ${right})`),
            onParallel: (left_3, right_1) => new Error(`Parallel (left: ${left_3}) (right: ${right_1})`)
        });
        const effectPretty = Cause.pretty(result.cause);
        if (effectPretty && typeof effectPretty === "string" && mappedError instanceof Error) {
            mappedError.stack = effectPretty;
        }
        throw mappedError;
    }
    return result.value;
};
