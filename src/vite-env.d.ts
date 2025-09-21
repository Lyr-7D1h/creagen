/**
 * Conditional if asserts should be used when used in an if statement it will get treeshaken if false
 *
 * Example:
 * ```ts
 * if (CREAGEN_ASSERTS) {
 *  // code
 * }
 * ```
 *
 * will turn into
 *
 * ```ts
 * {
 *  // code
 * }
 * ```
 *
 * when compiled with `CREAGEN_ASSERTS` is true otherwise the statement is omitted
 *
 * */
declare const CREAGEN_ASSERTS: boolean
declare const CREAGEN_PRECISION: number
