import { UnitRandomFn } from './Random'

// ========== STATIC ITERATOR GENERATORS ==========

function range(start: number, stop?: number): Generator<number>
function range(stop: number): Generator<number>
function* range(x1: number, x2?: number): Generator<number> {
  const stop = typeof x2 === 'undefined' ? x1 : x2
  const start = typeof x2 === 'undefined' ? 0 : x1
  for (let i = start; i < stop; i++) {
    yield i
  }
}

/**
 * A wrapper class for iterables that provides chainable iterator operations
 */
export class Iter<T> implements Iterable<T> {
  constructor(private iterable: Iterable<T>) {}

  /** Make the class itself iterable */
  *[Symbol.iterator](): Iterator<T> {
    yield* this.iterable
  }

  // ========== STATIC FACTORY METHODS ==========

  /** Create an Iter from a range of numbers */
  static range(start: number, stop?: number): Iter<number>
  static range(stop: number): Iter<number>
  static range(x1: number, x2?: number): Iter<number> {
    return new Iter(range(x1, x2))
  }

  /** Create an Iter from any iterable */
  static from<T>(iterable: Iterable<T>): Iter<T> {
    return new Iter(iterable)
  }

  // ========== CHAINABLE METHODS ==========

  /** Split the iterable into chunks of specified size */
  chunk(chunkSize: number): Iter<T[]> {
    const self = this
    return new Iter(
      (function* () {
        if (chunkSize <= 0) {
          throw new Error('Chunk size must be greater than 0')
        }

        let currentChunk: T[] = []

        for (const item of self.iterable) {
          currentChunk.push(item)

          if (currentChunk.length === chunkSize) {
            yield currentChunk
            currentChunk = []
          }
        }

        /** Yield remaining items if any */
        if (currentChunk.length > 0) {
          yield currentChunk
        }
      })(),
    )
  }

  /** Randomize the order of items */
  randomize(length: number, randomFn: UnitRandomFn = Math.random): Iter<T> {
    const self = this
    return new Iter(
      (function* () {
        const visited = new Array(length).fill(false)
        const items = Array.from(self.iterable)

        let i = 0
        while (i < length) {
          const r = Math.floor(randomFn() * length)
          if (visited[r]) continue
          visited[r] = true
          yield items[r]
          i++
        }
      })(),
    )
  }

  /** Map each item to a new value */
  map<U>(fn: (item: T, index: number) => U): Iter<U> {
    const self = this
    return new Iter(
      (function* () {
        let index = 0
        for (const item of self.iterable) {
          yield fn(item, index)
          index++
        }
      })(),
    )
  }

  /** Filter items based on a predicate */
  filter(fn: (item: T, index: number) => boolean): Iter<T> {
    const self = this
    return new Iter(
      (function* () {
        let index = 0
        for (const item of self.iterable) {
          if (fn(item, index)) {
            yield item
          }
          index++
        }
      })(),
    )
  }

  // ========== TERMINAL METHODS ==========

  /** Find the index of the first item that matches the predicate */
  findIndex(fn: (item: T, index: number) => boolean): number {
    let index = 0
    for (const item of this.iterable) {
      if (fn(item, index)) {
        return index
      }
      index++
    }
    return -1
  }

  /** Reduce the iterable to a single value */
  reduce<U>(fn: (acc: U, item: T, index: number) => U, initial: U): U {
    let index = 0
    let acc = initial
    for (const item of this.iterable) {
      acc = fn(acc, item, index)
      index++
    }
    return acc
  }

  /** Convert to array */
  toArray(): T[] {
    return Array.from(this.iterable)
  }

  /** Get the first item, or undefined if empty */
  first(): T | undefined {
    for (const item of this.iterable) {
      return item
    }
    return undefined
  }

  /** Count the number of items */
  count(): number {
    let count = 0
    for (const _ of this.iterable) {
      count++
    }
    return count
  }
}
