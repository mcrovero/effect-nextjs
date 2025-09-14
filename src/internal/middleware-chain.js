import * as Effect_ from "effect/Effect";
/**
 * @since 0.5.0
 * @category utils
 */
export const createMiddlewareChain = (tags, resolve, base, options) => {
    const buildChain = (index) => {
        if (index >= tags.length) {
            return base;
        }
        const tag = tags[index];
        const middleware = resolve(tag);
        const tail = buildChain(index + 1);
        if (tag.wrap) {
            return middleware({ ...options, next: tail });
        }
        return tag.provides !== undefined
            ? Effect_.provideServiceEffect(tail, tag.provides, middleware(options))
            : Effect_.zipRight(middleware(options), tail);
    };
    return buildChain(0);
};
