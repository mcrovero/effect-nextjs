/**
 * @since 0.5.0
 */
import { Effect } from "effect";
import * as Context_ from "effect/Context";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { pipeArguments } from "effect/Pipeable";
import { executeWithRuntime } from "./internal/executor.js";
import { createMiddlewareChain } from "./internal/middleware-chain.js";
import { getRuntime, setRuntime } from "./internal/runtime-registry.js";
/**
 * @since 0.5.0
 * @category constants
 */
const NextSymbolKey = "@mcrovero/effect-nextjs/Next";
/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId = Symbol.for(NextSymbolKey);
/**
 * @since 0.5.0
 * @category models
 */
const Proto = {
    [TypeId]: TypeId,
    pipe() {
        return pipeArguments(this, arguments);
    },
    middleware(middleware) {
        if (this.runtime) {
            return makeProto({
                _tag: this._tag,
                runtime: this.runtime,
                middlewares: [...this.middlewares, middleware]
            });
        }
        return makeProto({
            _tag: this._tag,
            middlewares: [...this.middlewares, middleware]
        });
    },
    build(handler) {
        const runtime = this.runtime;
        return async (...args) => {
            const middlewares = this.middlewares;
            const program = Effect.gen(function* () {
                const context = yield* Effect.context();
                let handlerEffect = handler(...args);
                if (middlewares.length > 0) {
                    const tags = middlewares;
                    handlerEffect = createMiddlewareChain(tags, (tag) => Context_.unsafeGet(context, tag), handlerEffect, { props: args });
                }
                return yield* handlerEffect;
            });
            /**
             * In development we use global registry to get the runtime
             * to support hot-reloading.
             */
            if (runtime) {
                const actualRuntime = getRuntime(`${NextSymbolKey}/${this._tag}`, runtime);
                return executeWithRuntime(actualRuntime, program);
            }
            return executeWithRuntime(undefined, program);
        };
    }
};
const makeProto = (options) => {
    function Next() { }
    Object.setPrototypeOf(Next, Proto);
    Object.assign(Next, options);
    Next.key = `${NextSymbolKey}/${options._tag}`;
    return Next;
};
export function make(tag, layer) {
    if (layer) {
        const runtime = ManagedRuntime.make(layer);
        setRuntime(`${NextSymbolKey}/${tag}`, runtime);
        return makeProto({
            _tag: tag,
            runtime,
            middlewares: []
        });
    }
    return makeProto({
        _tag: tag,
        middlewares: []
    });
}
