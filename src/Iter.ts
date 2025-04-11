export const Iter = {
  findIndex: function <T>(
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
  },

  reduce: function <T, U>(
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
  },
}
