/**
 * @since 0.5.0
 */
import * as Context from "effect/Context";
import * as Effect_ from "effect/Effect";
import * as Layer_ from "effect/Layer";
import * as Schema from "effect/Schema";
/**
 * @since 0.5.0
 * @category type ids
 */
export const TypeId = Symbol.for("@mcrovero/effect-nextjs/Middleware");
/**
 * @since 0.5.0
 * @category tags
 */
export const Tag = () => (id, options) => {
    const Err = globalThis.Error;
    const limit = Err.stackTraceLimit;
    Err.stackTraceLimit = 2;
    const creationError = new Err();
    Err.stackTraceLimit = limit;
    function TagClass() { }
    const TagClass_ = TagClass;
    Object.setPrototypeOf(TagClass, Object.getPrototypeOf(Context.GenericTag(id)));
    TagClass.key = id;
    Object.defineProperty(TagClass, "stack", {
        get() {
            return creationError.stack;
        }
    });
    TagClass_[TypeId] = TypeId;
    TagClass_.failure = options?.failure === undefined ? Schema.Never : options.failure;
    TagClass_.catches = options && options.wrap === true && options.catches !== undefined
        ? options.catches
        : Schema.Never;
    if (options?.provides) {
        TagClass_.provides = options.provides;
    }
    TagClass_.wrap = options?.wrap ?? false;
    TagClass_.returns = options && options.wrap === true && options.returns !== undefined
        ? options.returns
        : Schema.Never;
    return TagClass;
};
export function layer(tag, impl) {
    return Layer_.effect(tag, Effect_.as(Effect_.context(), impl));
}
