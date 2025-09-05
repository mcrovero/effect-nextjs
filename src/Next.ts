import * as Context from "effect/Context"
/**
 * @since 0.5.0
 * @category services
 */
export const Params = Context.GenericTag<
  Readonly<Record<string, string | Array<string> | undefined>>
>("@mcrovero/effect-nextjs/Params")

/**
 * @since 0.5.0
 * @category services
 */
export const SearchParams = Context.GenericTag<
  Readonly<Record<string, string | Array<string> | undefined>>
>("@mcrovero/effect-nextjs/SearchParams")
