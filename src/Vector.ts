import * as Math from './math'
import type { FixedArray, FlatBounds } from './types'

type Y<N extends number> = N extends 3
  ? number
  : N extends 2
    ? number
    : undefined
type Z<N extends number> = N extends 3 ? number : undefined

/**
 * Helper type for static vector factory methods.
 * Strips the dimension-dependent VectorMethods interface and re-applies it with the correct dimension.
 * This preserves the base vector type (Vector, Float32Vector, etc.) while fixing the dimension.
 *
 * @example
 * ```ts
 * // polar returns 2D vectors
 * const v1: StaticVectorResult<Vector<number>, 2> = Vector.polar(1, 0)
 * // Equivalent to: Vector<2>
 *
 * // linSpace returns vectors with the specified dimension
 * const v2: StaticVectorResult<Float32Vector<number>, 5> = Float32Vector.linSpace(0, 10, 5)
 * // Equivalent to: Float32Vector<5>
 * ```
 */
export type StaticVectorResult<
  TVector extends VectorMethods<number>,
  N extends number,
> = Omit<TVector, keyof VectorMethods<number>> & VectorMethods<N>

type NumberArrayLike<N extends number = number> = ArrayLike<number> & {
  length: N
}
type MutableNumberArrayLike<N extends number = number> = NumberArrayLike<N> & {
  [index: number]: number
}
type VectorArrayConstructor<TArray extends MutableNumberArrayLike<number>> = {
  new (length: number): TArray
  readonly prototype: TArray
}
type VectorItems<N extends number> =
  | [NumberArrayLike<N>]
  | (number[] & { length: N })
  | number[]
const VECTOR_BRAND = Symbol('creagen.vector')

export type VectorStorage<N extends number = number> = MutableNumberArrayLike<N>
export type VectorInput<N extends number = number> = NumberArrayLike<N>
export type VectorLike<N extends number = number> = VectorStorage<N> &
  Iterable<number> & {
    readonly x: number
    readonly y: Y<N>
    readonly z: Z<N>
  }

function vectorFrom<TVector extends object>(
  vector: TVector,
  values: ArrayLike<number>,
): TVector {
  const Constructor = vector.constructor as new (
    items: ArrayLike<number>,
  ) => TVector
  return new Constructor(values)
}

export function isVector<N extends number = number>(
  value: unknown,
): value is VectorLike<N> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[VECTOR_BRAND] === true
  )
}

/**
 * Full interface of all vector instance methods.
 * Declared explicitly so the `this` return types survive TypeScript's
 * declaration emit (anonymous structural types cannot express `this`).
 */
export interface VectorMethods<N extends number> {
  [index: number]: number
  readonly length: N
  get x(): number
  set x(v: number)
  get y(): Y<N>
  set y(v: number)
  get z(): Z<N>
  set z(v: number)
  push(): number
  pop(): number | undefined
  clone(): this
  /** Squared euclidean distance to another vector */
  dist2(v: VectorInput<N>): number
  dist(v: VectorInput<N>): number
  /** mutable mapping of vector values */
  mutmap(
    callbackfn: (
      value: number,
      index: number,
      array: VectorStorage<N>,
    ) => number,
  ): this
  add(v: VectorInput<N>): this
  /** normalize */
  norm(): this
  sub(v: VectorInput<N>): this
  roundToDec(dec?: number): this
  /** Linear interpolation towards `target` in steps of `alpha`% */
  lerp(target: VectorInput<N>, alpha: number): this
  /** Randomize the order of the elements inside of the vector */
  randomSort(): this
  /** Compare two vectors for equality */
  equals(v: VectorInput<N>): boolean
  /** Check if any component is NaN using [`Number.isNaN()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN) */
  isNaN(): boolean
  /** Check if all components are finite numbers using [`Number.isFinite()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isFinite) */
  isFinite(): boolean
  dot(v: VectorInput<N>): number
  /**
   * Treat two vectors as a 2d matrix and get the
   * [determinant](https://en.wikipedia.org/wiki/Determinant) between them.
   */
  det(vector: VectorInput<2>): number
  /** Apply modulo to each value */
  mod(mod: number): this
  round(): this

  /** Divide vector by vector */
  divVector(v: VectorInput<N>): this

  /** Divide vector */
  div(s: number): this
  /** Divide each value */
  div(x: number, y: number): this
  /** Divide each value */
  div(...divisors: FixedArray<number, N>): this
  /** Scale vector */
  mul(s: number): this
  /** Multiply each value */
  mul(x: number, y: number): this
  /** Multiply each value */
  mul(...multipliers: FixedArray<number, N>): this
  floor(): this
  scale(s: number): this
  /** arithmetic mean */
  mean(): number
  /** arithmetic average */
  average(): number
  /** magnitude */
  mag(): number
  /** magnitude squared */
  mag2(): number
  /** Apply a power to all elements */
  pow(power: number): this
  /** Calculate the average difference from the average */
  spread(): number
  /** Calculate the average difference from the average squared */
  spread2(): number
  chunk<M extends number>(size: M): VectorLike<M>[]
  /** Check if a number is within `limits` */
  within(bounds: FlatBounds<N>): boolean
  /**
   * Angle between x-axis and ray from origin to [x,y] from -pi to pi
   * https://en.wikipedia.org/wiki/Atan2
   */
  atan2(): number
  /**
   * Positive atan2 — from 0 to 2pi
   * https://en.wikipedia.org/wiki/Atan2
   */
  atan2p(): number
  /**
   * Rotate the vector around its zero point
   * @param theta - the angle to rotate in radians
   */
  rotate(theta: number): this
  rotateLeft(): this
  rotateRight(): this
  /** if a number is above or below a limit it corrects it so it is within the boundary limits */
  wrapAround(bounds: FlatBounds<N>): this
  /** Clamp each dimension to stay within bounds */
  clamp(bounds: FlatBounds<N>): this
  /** Clamp each dimension to stay within min/max values */
  clampRange(min: number, max: number): this
  /** Reflect off bounds when hitting them (bouncing behavior) */
  reflect(bounds: FlatBounds<N>): this
  /** Scale vector to fit within bounds while maintaining proportions */
  fitToBounds(bounds: FlatBounds<N>): this
  sum(): number
  max(): number
  compare(vector: VectorInput<N>): boolean
}

type VectorBaseConstructor = {
  new <N extends number>(...items: VectorItems<N>): VectorMethods<N>
  /** Generate an evenly spaced vector */
  linSpace<TVector extends VectorMethods<number>, N extends number>(
    this: new (items: ArrayLike<number>) => TVector,
    start: number,
    end: number,
    count: N,
  ): StaticVectorResult<TVector, N>
  empty<TVector extends VectorMethods<number>, N extends number>(
    this: new (items: ArrayLike<number>) => TVector,
    length: N,
  ): StaticVectorResult<TVector, N>
  /** https://en.wikipedia.org/wiki/Polar_coordinate_system */
  polar<TVector extends VectorMethods<number>>(
    this: new (items: ArrayLike<number>) => TVector,
    radius: number,
    angle: number,
  ): StaticVectorResult<TVector, 2>
}

/** Factory function for creating a vector type with a given base class. */
export function createVectorType<TArray extends MutableNumberArrayLike<number>>(
  Base: VectorArrayConstructor<TArray>,
): VectorBaseConstructor {
  const VectorBaseClass = Base as unknown as VectorArrayConstructor<
    MutableNumberArrayLike<number>
  >

  return class VectorBase<N extends number> extends VectorBaseClass {
    [index: number]: number

    constructor(...items: VectorItems<N>) {
      const first = items[0]
      if (first === undefined) {
        throw Error("can't create empty vector")
      }
      if (typeof first === 'number') {
        // Spread-numbers path: items is already the right shape, use it directly.
        super(items.length)
        Object.defineProperty(this, VECTOR_BRAND, {
          value: true,
          enumerable: false,
          configurable: false,
        })
        for (let i = 0; i < items.length; i++) {
          this[i] = items[i] as number
        }
      } else if ((Base as unknown) === Array) {
        // Array base: allocate by length and copy directly from the source —
        // no Array.from() intermediate allocation.
        super(first.length)
        Object.defineProperty(this, VECTOR_BRAND, {
          value: true,
          enumerable: false,
          configurable: false,
        })
        for (let i = 0; i < first.length; i++) {
          this[i] = first[i]
        }
      } else {
        // TypedArray base: pass the ArrayLike directly to super() so the native
        // constructor handles the copy - no intermediate array or manual loop needed.
        super(first as unknown as number)
        Object.defineProperty(this, VECTOR_BRAND, {
          value: true,
          enumerable: false,
          configurable: false,
        })
      }
    }

    /** Generate a evenly spaced vector */
    static linSpace<TVector extends VectorMethods<number>, N extends number>(
      this: new (items: ArrayLike<number>) => TVector,
      start: number,
      end: number,
      count: N,
    ): StaticVectorResult<TVector, N> {
      return new this(
        Array.from(
          { length: count },
          (_, i) => start + (end - start) * (i / (count - 1)),
        ),
      ) as unknown as StaticVectorResult<TVector, N>
    }

    static empty<TVector extends VectorMethods<number>, N extends number>(
      this: new (items: ArrayLike<number>) => TVector,
      length: N,
    ): StaticVectorResult<TVector, N> {
      return new this(Array(length).fill(0)) as unknown as StaticVectorResult<
        TVector,
        N
      >
    }

    /** https://en.wikipedia.org/wiki/Polar_coordinate_system */
    static polar<TVector extends VectorMethods<number>>(
      this: new (items: ArrayLike<number>) => TVector,
      radius: number,
      angle: number,
    ): StaticVectorResult<TVector, 2> {
      return new this([
        radius * Math.cos(angle),
        radius * Math.sin(angle),
      ]) as unknown as StaticVectorResult<TVector, 2>
    }

    /**
     * Return the dimension of the Vector
     *
     * NOTE: use `.mag()` to get the magnitude of the vector
     * */
    override get length(): N {
      return super.length as N
    }

    get x(): number {
      return this[0]
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

    push(): number {
      throw new Error('Cannot add items to FixedSizeArray')
    }

    pop(): number | undefined {
      throw new Error('Cannot remove items from FixedSizeArray')
    }

    clone(): this {
      return vectorFrom(this, this)
    }

    /** Squared euclidean distance to another vector */
    dist2(v: VectorInput<N>) {
      let dist = 0
      for (let i = 0; i < this.length; i++) {
        dist += (this[i] - v[i]) ** 2
      }
      return dist
    }

    dist(v: VectorInput<N>) {
      return Math.sqrt(this.dist2(v))
    }

    /** mutable mapping oftor values */
    mutmap(
      callbackfn: (
        value: number,
        index: number,
        array: VectorStorage<N>,
      ) => number,
    ): this {
      for (let i = 0; i < this.length; i++) {
        this[i] = callbackfn(this[i], i, this)
      }
      return this
    }

    add(v: VectorInput<N>): this {
      for (let i = 0; i < this.length; i++) {
        this[i] += v[i]
      }
      return this
    }

    /** normalize */
    norm(): this {
      let mag2 = this.mag2()
      if (mag2 === 0) return this
      if (!Number.isFinite(mag2)) {
        const max = this.max()
        this.div(max)
        mag2 = this.mag2()
      }
      const a = 1 / Math.sqrt(mag2)
      if (a === 0) return this
      for (let i = 0; i < this.length; i++) {
        this[i] *= a
      }
      return this
    }

    sub(v: VectorInput<N>): this {
      for (let i = 0; i < this.length; i++) {
        this[i] -= v[i]
      }
      return this
    }

    roundToDec(dec?: number): this {
      for (let i = 0; i < this.length; i++) {
        this[i] = Math.roundToDec(this[i], dec)
      }
      return this
    }

    /** Linear interpolation towards `target` in steps of `alpha`% where alpha is a number between [0-1] */
    lerp(target: VectorInput<N>, alpha: number): this {
      for (let i = 0; i < this.length; i++) {
        this[i] = (1 - alpha) * this[i] + alpha * target[i]
      }
      return this
    }

    /** Randomize the order of the elements inside of the vector  */
    randomSort(): this {
      const current = this.clone()
      const visited = new Array(this.length).fill(false)
      let i = 0
      while (i < this.length) {
        const r = Math.floor(Math.random() * this.length)
        if (visited[r]) continue
        visited[r] = true
        this[i] = current[r]
        i++
      }
      return this
    }

    /** Compare two vectors for equality */
    equals(v: VectorInput<N>) {
      for (let i = 0; i < this.length; i++) {
        if (this[i] !== v[i]) {
          return false
        }
      }
      return true
    }

    /** Check if any component is NaN */
    isNaN(): boolean {
      for (let i = 0; i < this.length; i++) {
        if (Number.isNaN(this[i])) {
          return true
        }
      }
      return false
    }

    /** Check if all components are finite numbers */
    isFinite(): boolean {
      for (let i = 0; i < this.length; i++) {
        if (!Number.isFinite(this[i])) {
          return false
        }
      }
      return true
    }

    dot(v: VectorInput<N>) {
      let a = 0
      for (let i = 0; i < this.length; i++) {
        a += this[i] * v[i]
      }
      return a
    }

    /**
     * Treat two vectors as a 2d matrix and get the [determinant](https://en.wikipedia.org/wiki/Determinant) between them
     *
     * Useful for determining the orientation between two vectors.
     * 1. Postive determinant: `vector` is counter-clockwise oriented compared to `this`
     *
     * 2. Negative determinant: `vector` is clockwise oriented compared to `this`
     *
     * 3. Zero determinant: The determinant is singular. Both vectors are pointing in the same direction. They are scalar multiples of eachother.
     */
    det(vector: VectorInput<2>) {
      if (this.length != 2) throw new Error('Only 2d vectors are supported')

      return this[0] * vector[1] - this[1] * vector[0]
    }

    /** Apply modulo to each value */
    mod(mod: number): this {
      for (let i = 0; i < this.length; i++) {
        this[i] %= mod
      }
      return this
    }

    round(): this {
      for (let i = 0; i < this.length; i++) {
        this[i] = Math.round(this[i])
      }
      return this
    }

    divVector(v: VectorInput<N>) {
      for (let i = 0; i < this.length; i++) {
        this[i] /= v[i]
      }
      return this
    }

    /** Divide vector */
    div(s: number): this
    /** Divide each value */
    div(x: number, y: number): this
    /** Divide each value */
    div(...divisors: FixedArray<number, N>): this
    /** Divide/scale vector */
    div(...divisors: number[]): this {
      if (divisors.length === 1) {
        const s = divisors[0]
        for (let i = 0; i < this.length; i++) {
          this[i] /= s
        }
        return this
      }

      for (let i = 0; i < this.length; i++) {
        if (divisors[i] === undefined) break
        this[i] /= divisors[i]
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
        this[i] *= multipliers[i]
      }

      return this
    }

    floor(): this {
      for (let i = 0; i < this.length; i++) {
        this[i] = Math.floor(this[i])
      }
      return this
    }

    scale(s: number): this {
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
        m += this[i] ** 2
      }
      return m
    }

    /** Apply a power to all elements */
    pow(power: number): this {
      for (let i = 0; i < this.length; i++) {
        this[i] **= power
      }
      return this
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
        spread += Math.pow(this[i] - average, 2)
      }

      return spread / this.length
    }

    chunk<M extends number>(size: M): VectorLike<M>[] {
      if (size < 0 || !Number.isFinite(size)) {
        throw Error('size must be a positive number')
      }
      let index = 0,
        resIndex = 0
      const result = Array<VectorLike<M>>(Math.ceil(this.length / size))

      while (index < this.length) {
        result[resIndex++] = vectorFrom(
          this,
          (
            this as unknown as {
              slice(start?: number, end?: number): ArrayLike<number>
            }
          ).slice(index, (index += size)),
        ) as unknown as VectorLike<M>
      }
      return result
    }

    /** Check if a number is within `limits` */
    within(bounds: FlatBounds<N>): boolean {
      let d = 0
      for (let i = 0; i < this.length; i++) {
        const start = bounds[d]
        d++
        const stop = bounds[d]
        d++
        if (this[i] < start || this[i] > stop) {
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
      return Math.atan2(this[1], this[0])
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
      const a = Math.atan2(this[1], this[0])
      return a >= 0 ? a : a + 2 * Math.PI
    }

    /**
     * Rotate the vector around its zero point
     * @param theta - the angle to rotate in radians
     * */
    rotate(theta: number): this {
      if (this.length != 2) throw new Error('Only 2d rotation are supported')
      if (theta === -Math.PI / 2) {
        this.rotateLeft()
      } else if (theta === Math.PI / 2) {
        this.rotateRight()
      } else {
        const x = this[0]
        const y = this[1]
        this[0] = x * Math.cos(theta) - y * Math.sin(theta)
        this[1] = x * Math.sin(theta) + y * Math.cos(theta)
      }
      return this
    }

    rotateLeft(): this {
      if (this.length != 2) throw new Error('Only 2d rotation are supported')
      const x = this[0]
      this[0] = -this[1]
      this[1] = x
      return this
    }

    rotateRight(): this {
      if (this.length != 2) throw new Error('Only 2d rotation are supported')
      const x = this[0]
      this[0] = this[1]
      this[1] = -x
      return this
    }

    /** if a number is above or below a limit it correct it so it is within the boundary limits */
    wrapAround(bounds: FlatBounds<N>): this {
      let d = 0
      for (let i = 0; i < this.length; i++) {
        const start = bounds[d]
        d++
        const stop = bounds[d]
        d++

        const v = this[i]
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

    /** Clamp each dimension to stay within bounds */
    clamp(bounds: FlatBounds<N>): this {
      let d = 0
      for (let i = 0; i < this.length; i++) {
        const min = bounds[d]
        d++
        const max = bounds[d]
        d++
        this[i] = Math.max(min, Math.min(max, this[i]))
      }
      return this
    }

    /** Clamp each dimension to stay within min/max values */
    clampRange(min: number, max: number): this {
      for (let i = 0; i < this.length; i++) {
        this[i] = Math.max(min, Math.min(max, this[i]))
      }
      return this
    }

    /** Reflect off bounds when hitting them (bouncing behavior) */
    reflect(bounds: FlatBounds<N>): this {
      let d = 0
      for (let i = 0; i < this.length; i++) {
        const min = bounds[d]
        d++
        const max = bounds[d]
        d++
        const v = this[i]

        if (v < min) {
          this[i] = min + (min - v)
        } else if (v > max) {
          this[i] = max - (v - max)
        }
      }
      return this
    }

    /** Scale vector to fit within bounds while maintaining proportions */
    fitToBounds(bounds: FlatBounds<N>): this {
      let minScale = Infinity

      let d = 0
      for (let i = 0; i < this.length; i++) {
        const min = bounds[d]
        d++
        const max = bounds[d]
        d++

        const v = this[i]
        const range = max - min

        if (v !== 0) {
          const scale = range / Math.abs(v)
          minScale = Math.min(minScale, scale)
        }
      }

      if (minScale !== Infinity) {
        this.scale(minScale)
      }

      return this
    }

    sum(): number {
      let a = 0
      for (let i = 0; i < this.length; i++) {
        a += this[i]
      }
      return a
    }

    max(): number {
      if (this.length === 0) return -Infinity
      let max = this[0]
      for (let i = 1; i < this.length; i++) {
        if (this[i] > max) max = this[i]
      }
      return max
    }

    compare(vector: VectorInput<N>) {
      for (let i = 0; i < this.length; i++) {
        if (this[i] !== vector[i]) return false
      }
      return true
    }
  }
}

const ArrayVectorBase = createVectorType(
  Array as unknown as VectorArrayConstructor<number[]>,
)
const Float32VectorBase = createVectorType(Float32Array)
const Float64VectorBase = createVectorType(Float64Array)
const Int8VectorBase = createVectorType(Int8Array)
const Int16VectorBase = createVectorType(Int16Array)
const Int32VectorBase = createVectorType(Int32Array)
const Uint8VectorBase = createVectorType(Uint8Array)
const Uint8ClampedVectorBase = createVectorType(Uint8ClampedArray)
const Uint16VectorBase = createVectorType(Uint16Array)
const Uint32VectorBase = createVectorType(Uint32Array)

/* eslint-disable
  @typescript-eslint/no-unsafe-declaration-merging,
  @typescript-eslint/no-empty-object-type,
  @typescript-eslint/no-unused-vars
*/
export class Vector<N extends number> extends ArrayVectorBase<N> {}
export interface Vector<N extends number> extends Omit<
  Array<number>,
  'length' | 'push'
> {}
export class Float32Vector<N extends number> extends Float32VectorBase<N> {}
export interface Float32Vector<N extends number> extends Omit<
  Float32Array,
  'length'
> {}
export class Float64Vector<N extends number> extends Float64VectorBase<N> {}
export interface Float64Vector<N extends number> extends Omit<
  Float64Array,
  'length'
> {}
export class Int8Vector<N extends number> extends Int8VectorBase<N> {}
export interface Int8Vector<N extends number> extends Omit<
  Int8Array,
  'length'
> {}
export class Int16Vector<N extends number> extends Int16VectorBase<N> {}
export interface Int16Vector<N extends number> extends Omit<
  Int16Array,
  'length'
> {}
export class Int32Vector<N extends number> extends Int32VectorBase<N> {}
export interface Int32Vector<N extends number> extends Omit<
  Int32Array,
  'length'
> {}
export class Uint8Vector<N extends number> extends Uint8VectorBase<N> {}
export interface Uint8Vector<N extends number> extends Omit<
  Uint8Array,
  'length'
> {}
export class Uint8ClampedVector<
  N extends number,
> extends Uint8ClampedVectorBase<N> {}
export interface Uint8ClampedVector<N extends number> extends Omit<
  Uint8ClampedArray,
  'length'
> {}
export class Uint16Vector<N extends number> extends Uint16VectorBase<N> {}
export interface Uint16Vector<N extends number> extends Omit<
  Uint16Array,
  'length'
> {}
export class Uint32Vector<N extends number> extends Uint32VectorBase<N> {}
export interface Uint32Vector<N extends number> extends Omit<
  Uint32Array,
  'length'
> {}
/* eslint-enable
  @typescript-eslint/no-unsafe-declaration-merging,
  @typescript-eslint/no-empty-object-type,
  @typescript-eslint/no-unused-vars
*/

export type AnyVector<N extends number = number> =
  | Vector<N>
  | Float32Vector<N>
  | Float64Vector<N>
  | Int8Vector<N>
  | Int16Vector<N>
  | Int32Vector<N>
  | Uint8Vector<N>
  | Uint8ClampedVector<N>
  | Uint16Vector<N>
  | Uint32Vector<N>

function getVectorConstructor(
  value: unknown,
): new <N extends number>(...items: VectorItems<N>) => VectorLike<N> {
  if (value instanceof Float32Array) return Float32Vector
  if (value instanceof Float64Array) return Float64Vector
  if (value instanceof Int8Array) return Int8Vector
  if (value instanceof Int16Array) return Int16Vector
  if (value instanceof Int32Array) return Int32Vector
  if (value instanceof Uint8Array) return Uint8Vector
  if (value instanceof Uint8ClampedArray) return Uint8ClampedVector
  if (value instanceof Uint16Array) return Uint16Vector
  if (value instanceof Uint32Array) return Uint32Vector
  return Vector
}

/** Create a vector, preserving typed array type when passed */
export function vec<N extends number>(
  ...items: [Float32Array & { length: N }]
): Float32Vector<N>
export function vec<N extends number>(
  ...items: [Float64Array & { length: N }]
): Float64Vector<N>
export function vec<N extends number>(
  ...items: [Int8Array & { length: N }]
): Int8Vector<N>
export function vec<N extends number>(
  ...items: [Int16Array & { length: N }]
): Int16Vector<N>
export function vec<N extends number>(
  ...items: [Int32Array & { length: N }]
): Int32Vector<N>
export function vec<N extends number>(
  ...items: [Uint8Array & { length: N }]
): Uint8Vector<N>
export function vec<N extends number>(
  ...items: [Uint8ClampedArray & { length: N }]
): Uint8ClampedVector<N>
export function vec<N extends number>(
  ...items: [Uint16Array & { length: N }]
): Uint16Vector<N>
export function vec<N extends number>(
  ...items: [Uint32Array & { length: N }]
): Uint32Vector<N>
export function vec<N extends number>(...items: [NumberArrayLike<N>]): Vector<N>
export function vec<N extends number>(
  ...items: [...number[]] & { length: N }
): Vector<N>
export function vec<N extends number>(...items: [...number[]]): Vector<N>
export function vec<N extends number>(
  ...items: [NumberArrayLike<N>] | (number[] & { length: N })
): VectorLike<N> {
  const Constructor = getVectorConstructor(items[0])
  return new Constructor<N>(...(items as VectorItems<N>))
}

/** Array of direction vectors East, South, West, North */
export const DIRECTIONS = [vec(1, 0), vec(0, -1), vec(-1, 0), vec(0, 1)]

/** Array of diagonal direction vectors South-East, South-West, North-West, North-East */
export const DIAGONALS = [vec(1, -1), vec(-1, -1), vec(-1, 1), vec(1, 1)]

/** Array of all direction vectors both `DIRECTIONS` and `DIAGONALS` starting with East going clockwise */
export const ALL_DIRECTIONS = [
  vec(1, 0),
  vec(1, -1),
  vec(0, -1),
  vec(-1, -1),
  vec(-1, 0),
  vec(-1, 1),
  vec(0, 1),
  vec(1, 1),
]
