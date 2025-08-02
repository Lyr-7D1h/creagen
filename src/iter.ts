function range(start: number, stop?: number): Generator<number>
function range(stop: number): Generator<number>
function* range(x1: number, x2?: number): Generator<number> {
  const stop = typeof x2 === 'undefined' ? x1 : x2
  const start = typeof x2 === 'undefined' ? 0 : x1
  for (let i = start; i < stop; i++) {
    yield i
  }
}

function findIndex<T>(
  iterator: Generator<T>,
  fn: (item: T, index: number) => boolean,
) {
  let index = 0
  for (const item of iterator) {
    if (fn(item, index)) {
      return index
    }
    index++
  }
  return -1
}

function reduce<T, U>(
  iterator: Generator<T>,
  fn: (acc: U, item: T, index: number) => U,
  initial: U,
) {
  let index = 0
  let acc = initial
  for (const item of iterator) {
    acc = fn(acc, item, index)
    index++
  }
  return acc
}

// TODO: add test to verify randomness is enough
// const c = new Array(7).fill(0)
// for (const _ of Iter.range(1000000)) {
//   let i = 0;
//   const r = [...Iter.randomize([0, 1, 2, 3, 4, 5, 6], 7)][0]

//   c[r] += 1
//   i++
// }
function randomize<T>(arr: T[], length: number)
function* randomize<T>(iterator: Generator<T> | T[], length: number) {
  const visited = new Array(length).fill(false)
  const items = [...iterator]

  let i = 0
  while (i < length) {
    const r = Math.floor(Math.random() * length)
    if (visited[r]) continue
    visited[r] = true
    yield items[r]
    i++
  }
}

/** Utility functions for dealing with iterators and generating them */
export const Iter = {
  range,
  findIndex,
  reduce,
  randomize,
}
