// Type-level arithmetic to multiply N by 2 using tuple manipulation
type Tuple<
  N extends number,
  R extends readonly unknown[] = [],
> = R['length'] extends N ? R : Tuple<N, readonly [...R, unknown]>

type Multiply2<N extends number> = [
  ...Tuple<N>,
  ...Tuple<N>,
]['length'] extends number
  ? [...Tuple<N>, ...Tuple<N>]['length']
  : never

/** Type for flat bounds array: [min1, max1, min2, max2, ..., minN, maxN] */
export type FlatBounds<N extends number> = FixedArray<number, Multiply2<N>>

export type GrowToSize<
  T,
  N extends number,
  A extends T[],
  L extends number = A['length'],
> = L extends N ? A : L extends 999 ? T[] : GrowToSize<T, N, [...A, T]>

export type FixedNumberArray<N extends number> = GrowToSize<number, N, [], 0>
export type FixedArray<T, N extends number> = GrowToSize<T, N, [], 0>
