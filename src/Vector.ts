import * as Math from './math'

type Y<N extends number> = N extends 3
  ? number
  : N extends 2
    ? number
    : undefined
type Z<N extends number> = N extends 3 ? number : undefined

type GrowToSize<
  T,
  N extends number,
  A extends T[],
  L extends number = A['length'],
> = L extends N ? A : L extends 999 ? T[] : GrowToSize<T, N, [...A, T]>

export type FixedArray<T, N extends number> = GrowToSize<T, N, [], 0>

/** The bounds for a given N dimensional vector [[xmin, xmax], [ymin, ymax]] */
export type Bounds<N extends number> = FixedArray<[number, number], N>

export class Vector<N extends number> extends Array<number> {
  constructor(...items: [number[] & { length: N }])
  constructor(...items: number[] & { length: N })
  constructor(...items: number[])
  constructor(
    ...items: [number[] & { length: N }] | (number[] & { length: N })
  ) {
    if (typeof items[0] === 'undefined') {
      throw Error("can't create empty vector")
    }
    if (typeof items[0] === 'number') {
      super(...(items as number[]))
    } else {
      super(...(items[0] as number[]))
    }
  }

  /** Generate a evenly spaced vector */
  static linSpace(start: number, end: number, count: number) {
    return new Vector<1>(
      ...Array.from(
        { length: count },
        (_, i) => start + (end - start) * (i / (count - 1)),
      ),
    )
  }

  static empty<N extends number>(length: N) {
    return new Vector<N>(...Array(length).fill(0))
  }

  /** https://en.wikipedia.org/wiki/Polar_coordinate_system */
  static polar(radius: number, angle: number) {
    return new Vector<2>(radius * Math.cos(angle), radius * Math.sin(angle))
  }

  static create<N extends number>(
    ...items: [number[] & { length: N }] | (number[] & { length: N })
  ) {
    return new Vector<N>(...(items as number[]))
  }

  override get length(): N {
    return super.length as N
  }

  get x(): number {
    return this[0]!
  }

  set x(v: number) {
    this[0] = v
  }

  get y(): Y<N> {
    return this[1] as Y<N>
  }

  set y(v: number) {
    this[1] = v
  }

  get z(): Z<N> {
    return this[2] as Z<N>
  }

  set z(v: number) {
    this[1] = v
  }

  override push(): number {
    throw new Error('Cannot add items to FixedSizeArray')
  }

  override pop(): number | undefined {
    throw new Error('Cannot remove items from FixedSizeArray')
  }

  clone() {
    return new Vector<N>(
      ...([...this] as GrowToSize<number, N, [], 0> & {
        [Symbol.iterator]: () => any
      }),
    )
  }

  /** Squared euclidean distance to another vector */
  dist2(v: Vector<N>) {
    let dist = 0
    for (let i = 0; i < this.length; i++) {
      dist += (this[i]! - v[i]!) ** 2
    }
    return dist
  }

  dist(v: Vector<N>) {
    return Math.sqrt(this.dist2(v))
  }

  /** mutable mapping oftor values */
  mutmap(
    callbackfn: (value: number, index: number, array: number[]) => number,
  ) {
    for (let i = 0; i < this.length; i++) {
      this[i] = callbackfn(this[i]!, i, this)
    }
    return this
  }

  get(i: number) {
    return this[i]!
  }

  set(i: number, v: number) {
    this[i] = v
  }

  add(v: Vector<N>) {
    for (let i = 0; i < this.length; i++) {
      this[i] += v[i]!
    }
    return this
  }

  /** normalize */
  norm() {
    const mag2 = this.mag2()
    if (mag2 === 0) return this
    // TODO: use https://en.wikipedia.org/wiki/Fast_inverse_square_root
    const a = 1 / Math.sqrt(mag2)
    if (a === 0) return this
    for (let i = 0; i < this.length; i++) {
      this[i] *= a
    }
    return this
  }

  sub(v: Vector<N>) {
    for (let i = 0; i < this.length; i++) {
      this[i] -= v.get(i)
    }
    return this
  }

  roundToDec(dec?: number) {
    for (let i = 0; i < this.length; i++) {
      this[i] = Math.roundToDec(this[i]!, dec)
    }
    return this
  }

  /** Linear interpolation towards `target` in steps of `alpha`% */
  lerp(target: Vector<N>, alpha: number) {
    for (let i = 0; i < this.length; i++) {
      this[i] = (1 - alpha) * this[i]! + alpha * target[i]!
    }
    return this
  }

  /** Randomize the order of the elements inside of the vector  */
  randomSort(): this {
    const current = this.clone()
    const visited = new Array(this.length).fill(false)
    let i = 0
    while (i < this.length) {
      const r = Math.floor(Math.random() * length)
      if (visited[r]) continue
      visited[r] = true
      this[i] = current[r]
      i++
    }
    return this
  }

  /** Compare two vectors for equality */
  equals(v: Vector<N>) {
    for (let i = 0; i < this.length; i++) {
      if (this[i]! !== v[i]!) {
        return false
      }
    }
    return true
  }

  dot(v: Vector<N>) {
    let a = 0
    for (let i = 0; i < this.length; i++) {
      a += this[i]! * v[i]!
    }
    return a
  }

  /** Apply modulo to each value */
  mod(mod: number) {
    for (let i = 0; i < this.length; i++) {
      this[i] %= mod
    }
    return this
  }

  round() {
    for (let i = 0; i < this.length; i++) {
      this[i] = Math.round(this[i]!)
    }
    return this
  }

  /** Divide vector */
  div(s: number)
  /** Divide each value */
  div(x: number, y: number)
  /** Divide each value */
  div(...divisors: FixedArray<number, N>)
  /** Divide/scale vector */
  div(...divisors: number[]) {
    if (divisors.length === 1) {
      const s = divisors[0]
      for (let i = 0; i < this.length; i++) {
        this[i] /= s
      }
      return this
    }

    for (let i = 0; i < this.length; i++) {
      if (divisors[i] === undefined) break
      this[i] /= divisors[i]!
    }

    return this
  }

  /** Scale vector */
  mul(s: number): this
  /** Multiply each value */
  mul(x: number, y: number): this
  /** Multiply each value */
  mul(...multipliers: FixedArray<number, N>): this
  /** Multiple/scale vector */
  mul(...multipliers: number[]): this {
    if (multipliers.length === 1) {
      const s = multipliers[0]
      for (let i = 0; i < this.length; i++) {
        this[i] *= s
      }
      return this
    }

    for (let i = 0; i < this.length; i++) {
      if (multipliers[i] === undefined) break
      this[i] *= multipliers[i]!
    }

    return this
  }

  floor() {
    for (let i = 0; i < this.length; i++) {
      this[i] = Math.floor(this[i]!)
    }
    return this
  }

  scale(s: number) {
    for (let i = 0; i < this.length; i++) {
      this[i] *= s
    }
    return this
  }

  /** airthmetic mean */
  mean(): number {
    return this.average()
  }

  /** airthmetic average */
  average(): number {
    return this.sum() / this.length
  }

  /** magnitude squared */
  mag(): number {
    return Math.sqrt(this.mag2())
  }

  /** magnitude squared */
  mag2(): number {
    let m = 0
    for (let i = 0; i < this.length; i++) {
      m += this.get(i) ** 2
    }
    return m
  }

  /** Calculate the average difference from the average */
  spread() {
    return Math.sqrt(this.spread2())
  }

  /** Calculate the average difference from the average squared */
  spread2() {
    const average = this.average()
    let spread = 0
    for (let i = 0; i < this.length; i++) {
      spread += Math.pow(this.get(i) - average, 2)
    }

    return spread / this.length
  }

  chunk(size: number): Vector<any>[] {
    if (size < 0 || !Number.isFinite(size)) {
      throw Error('size must be a positive number')
    }
    var index = 0,
      resIndex = 0,
      result = Array(Math.ceil(this.length / size))

    while (index < this.length) {
      result[resIndex++] = this.slice(index, (index += size))
    }
    return result
  }

  /** Check if a number is within `limits` */
  within(bounds: Bounds<N>): boolean {
    for (let i = 0; i < this.length; i++) {
      const [start, stop] = (bounds as any)[i] as [number, number]
      if (this[i]! < start || this[i]! > stop) {
        return false
      }
    }
    return true
  }

  /**
   * Angle between x-axis and ray from origin to [x,y] from -pi to pi
   *
   * https://en.wikipedia.org/wiki/Atan2
   */
  atan2(): number {
    if (this.length != 2) throw new Error('Only 2d atan is supported')
    return Math.atan2(this[1]!, this[0]!)
  }

  /**
   * Positive atan2
   *
   * Angle between x-axis and ray from origin to [x,y] from 0 to 2pi
   *
   * https://en.wikipedia.org/wiki/Atan2
   */
  atan2p(): number {
    if (this.length != 2) throw new Error('Only 2d atan is supported')
    const a = Math.atan2(this[1]!, this[0]!)
    return a >= 0 ? a : a + 2 * Math.PI
  }

  /**
   * Rotate the vector around its zero point
   * @param theta - the angle to rotate in radians
   * */
  rotate(theta: number) {
    if (this.length != 2) throw new Error('Only 2d rotation are supported')
    if (theta === -Math.PI / 2) {
      this.rotateLeft()
    } else if (theta === Math.PI / 2) {
      this.rotateRight()
    } else {
      this[0] *= Math.cos(theta) + this[1] * Math.sin(theta)
      this[1] *= -Math.sin(theta) + this[0] * Math.cos(theta)
    }
    return this
  }

  rotateLeft() {
    if (this.length != 2) throw new Error('Only 2d rotation are supported')
    const x = this[0]
    this[0] = -this[1]
    this[1] = x
    return this
  }

  rotateRight() {
    if (this.length != 2) throw new Error('Only 2d rotation are supported')
    const x = this[0]
    this[0] = this[1]
    this[1] = -x
    return this
  }

  /** if a number is above or below a limit it correct it so it is within the boundary limits */
  wrapAround(bounds: Bounds<N>) {
    for (let i = 0; i < this.length; i++) {
      const [start, stop] = (bounds as any)[i] as [number, number]
      const v = this[i]!
      if (v < start) {
        const diff = stop - start
        this[i] = stop - ((start - v) % diff)
      } else if (v > stop) {
        const diff = stop - start
        this[i] = start + ((v - stop) % diff)
      }
    }
    return this
  }

  sum(): number {
    let a = 0
    for (let i = 0; i < this.length; i++) {
      a += this.get(i)
    }
    return a
  }

  compare(vector: Vector<N>) {
    for (let i = 0; i < this.length; i++) {
      if (this[i] !== vector[i]) return false
    }
    return true
  }
}

export interface Vector<N extends number> {
  create(...items: [number[] & { length: N }]): Vector<N>
  create(...items: number[] & { length: N }): Vector<N>
  create(...items: number[]): Vector<N>
  create(...items: [number[] & { length: N }]): Vector<N>
}

/** Short hand for `Vector.create()` */
export function vec<N extends number>(
  ...items: [number[] & { length: N }]
): Vector<N>
export function vec<N extends number>(
  ...items: [...number[]] & { length: N }
): Vector<N>
export function vec<N extends number>(...items: [...number[]]): Vector<N>
export function vec<N extends number>(
  ...items: [number[] & { length: N }] | (number[] & { length: N })
): Vector<N> {
  return Vector.create<N>(...(items as any))
}

/** Array of direction vectors East, South, West, North */
export const DIRECTIONS = [vec(1, 0), vec(0, -1), vec(-1, 0), vec(0, 1)]
