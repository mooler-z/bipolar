import { v, type Validator } from "convex/values";

/**
 * The shape a paginated query answers with.
 *
 * Convex's `paginate` returns more than the rows — a cursor, whether it has
 * reached the end, and two optional fields it uses to tell a client that a
 * page wants splitting. Every query in this codebase declares its return
 * validator, so the whole shape has to be spelled out; doing that at each call
 * site is four lines of noise per list and one of them wrong somewhere.
 */
export function pageOf<T extends Validator<unknown, "required", string>>(row: T) {
  return v.object({
    page: v.array(row),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null(),
      ),
    ),
  });
}

/** Twelve. One screen of rows, and the same everywhere. */
export const PAGE = 12;
