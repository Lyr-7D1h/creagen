import { CREAGEN_ASSERTS } from './constants'

export function assert(condition: unknown, message?: string): asserts condition {
  if (!CREAGEN_ASSERTS) return
  if (!condition) {
    throw new Error(message ?? 'Assertion failed')
  }
}

if (CREAGEN_ASSERTS) {
  ;(globalThis as { assert?: typeof assert }).assert = assert
}
