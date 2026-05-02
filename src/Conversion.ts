import type { FixedArray, FixedNumberArray, FlatBounds } from './types'
import { isVector, vec, Vector, type VectorLike } from './Vector'

/**
 * Static utility class for converting between different array formats
 * Handles type guards, validation, and efficient conversions
 * */
export class Conversion {
  // ========== TYPE GUARDS ==========

  /** Type guard for array-like structures (includes arrays, typed arrays, etc.) */
  static isArrayLike(v: unknown): v is ArrayLike<unknown> {
    if (!v || (typeof v !== 'object' && typeof v !== 'function')) return false
    if (!('length' in v)) return false
    const { length } = v
    return typeof length === 'number' && Number.isInteger(length) && length >= 0
  }

  /** Type guard for flat numeric arrays (1D) */
  static isFlatNumberArray(v: unknown): v is ArrayLike<number> {
    if (!Conversion.isArrayLike(v)) return false
    return v.length === 0 || typeof v[0] === 'number'
  }

  /** Type guard for nested numeric arrays (2D matrix) */
  static isNestedNumberArray(v: unknown): v is ArrayLike<ArrayLike<number>> {
    if (!Conversion.isArrayLike(v)) return false
    if (v.length === 0) return false
    const firstRow = v[0]
    if (!Conversion.isArrayLike(firstRow)) return false
    return firstRow.length === 0 || typeof firstRow[0] === 'number'
  }

  /** Type guard for typed arrays (Float32Array, Float64Array, etc.) */
  static isTypedArray(v: unknown): v is ArrayBufferView {
    return ArrayBuffer.isView(v)
  }

  /** Type guard for plain JavaScript arrays (excludes typed arrays) */
  static isPlainArray(v: unknown): v is unknown[] {
    return Array.isArray(v) && !Conversion.isTypedArray(v)
  }

  static isVector<N extends number>(
    v: ArrayLike<number>,
    dimension: N,
  ): v is VectorLike<N> {
    return isVector(v) && v.length === dimension
  }

  // ========== CORE CONVERSIONS ==========

  /**
   * Convert any array-like structure to Float64Array
   * Handles both flat and nested input formats
   * */
  static toFloat64Array(array: ArrayLike<number>): Float64Array
  static toFloat64Array(
    array: ArrayLike<number> | ArrayLike<ArrayLike<number>>,
    dimension: number,
  ): Float64Array
  static toFloat64Array(
    array: ArrayLike<number> | ArrayLike<ArrayLike<number>>,
    dimension?: number,
  ): Float64Array {
    if (array instanceof Float64Array) return array

    if (Conversion.isFlatNumberArray(array)) {
      return Conversion.flatToFloat64Array(array)
    }

    if (Conversion.isNestedNumberArray(array)) {
      if (dimension === undefined) {
        throw new Error('Dimension required for nested array conversion')
      }
      return Conversion.nestedToFloat64Array(array, dimension)
    }

    throw new Error(
      'Invalid array format: expected ArrayLike<number> or ArrayLike<ArrayLike<number>>',
    )
  }

  /** Convert flat array to Float64Array */
  static flatToFloat64Array(array: ArrayLike<number>): Float64Array {
    if (array instanceof Float64Array) return array

    const result = new Float64Array(array.length)
    for (let i = 0; i < array.length; i++) {
      result[i] = array[i]
    }
    return result
  }

  /** Convert nested array (matrix) to flat Float64Array */
  static nestedToFloat64Array(
    array: ArrayLike<ArrayLike<number>>,
    dimension: number,
  ): Float64Array {
    const result = new Float64Array(array.length * dimension)
    for (let i = 0; i < array.length; i++) {
      const row = array[i]
      for (let d = 0; d < dimension; d++) {
        result[i * dimension + d] = row[d]
      }
    }
    return result
  }

  /** Convert flat array to nested array (matrix format) */
  static flatToNested<N extends number>(
    array: ArrayLike<number>,
    dimension: N,
  ): FixedArray<number, N>[] {
    if (array.length % dimension !== 0) {
      throw new Error(
        `Array length ${array.length} not divisible by dimension ${dimension}`,
      )
    }

    const result: FixedArray<number, N>[] = []
    for (let i = 0; i < array.length; i += dimension) {
      const row = new Array(dimension)
      for (let d = 0; d < dimension; d++) {
        row[d] = array[i + d]
      }
      result.push(row as FixedArray<number, N>)
    }
    return result
  }

  /** Convert ArrayLike<number> to FixedNumberArray<N> */
  static toFixedNumberArray<N extends number>(
    array: ArrayLike<number>,
    dimension: N,
  ): FixedNumberArray<N> {
    if (array.length !== dimension) {
      throw new Error(
        `Array length ${array.length} does not match expected dimension ${dimension}`,
      )
    }

    const result = new Array(dimension)
    for (let i = 0; i < dimension; i++) {
      result[i] = array[i]
    }
    return result as FixedNumberArray<N>
  }

  /**
   * Convert ArrayLike or nested ArrayLike to Vector<N>[] with given dimension
   * Supports both flat arrays (chunked by dimension) and nested arrays
   */
  static toVectorArray<N extends number>(
    array: ArrayLike<number>,
    dimension: N,
  ): Vector<N>[]
  static toVectorArray<N extends number>(
    array: ArrayLike<ArrayLike<number>>,
    dimension: N,
  ): Vector<N>[]
  static toVectorArray<N extends number>(
    array: ArrayLike<number> | ArrayLike<ArrayLike<number>>,
    dimension: N,
  ): Vector<N>[] {
    // Handle flat array: chunk by dimension
    if (Conversion.isFlatNumberArray(array)) {
      if (array.length % dimension !== 0) {
        throw new Error(
          `Flat array length ${array.length} not divisible by dimension ${dimension}`,
        )
      }

      const result: Vector<N>[] = []
      for (let i = 0; i < array.length; i += dimension) {
        const vectorData: number[] = new Array<number>(dimension)
        for (let d = 0; d < dimension; d++) {
          vectorData[d] = array[i + d]
        }
        result.push(vec<N>(...vectorData))
      }
      return result
    }

    // Handle nested array: each sub-array becomes a vector
    if (Conversion.isNestedNumberArray(array)) {
      if (this.isVector(array[0], dimension) && array[0] instanceof Vector) {
        return array as Vector<N>[]
      }
      const result: Vector<N>[] = []
      for (let i = 0; i < array.length; i++) {
        const row = array[i]
        if (row.length !== dimension) {
          throw new Error(
            `Row ${i} has length ${row.length}, expected dimension ${dimension}`,
          )
        }

        const vectorData: number[] = new Array<number>(dimension)
        for (let d = 0; d < dimension; d++) {
          vectorData[d] = row[d]
        }
        result.push(vec<N>(...vectorData))
      }
      return result
    }

    throw new Error(
      'Invalid array format: expected ArrayLike<number> or ArrayLike<ArrayLike<number>>',
    )
  }

  // ========== SPECIALIZED CONVERSIONS ==========

  /** Convert various formats to flat bounds array [min1, max1, min2, max2, ...] */
  static toBounds<N extends number>(
    bounds: FlatBounds<N> | FixedArray<[number, number], N>,
  ): FlatBounds<N> {
    if (Conversion.isFlatNumberArray(bounds)) {
      return bounds
    }

    // Convert [[min1, max1], [min2, max2], ...] to [min1, max1, min2, max2, ...]
    const boundsArray = bounds as ArrayLike<[number, number]>
    const result: number[] = []
    for (let i = 0; i < boundsArray.length; i++) {
      const bound = boundsArray[i]
      result.push(bound[0], bound[1])
    }
    return result as FlatBounds<N>
  }
}
