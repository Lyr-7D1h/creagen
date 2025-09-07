import { FixedArray, FixedNumberArray, FlatBounds } from './types'
import { vec, Vector } from './Vector'

/**
 * Static utility class for converting between different array formats
 * Handles type guards, validation, and efficient conversions
 * */
export class Conversion {
  // ========== TYPE GUARDS ==========

  /** Type guard for array-like structures (includes arrays, typed arrays, etc.) */
  static isArrayLike(v: unknown): v is ArrayLike<unknown> {
    return (
      !!v &&
      typeof v === 'object' &&
      'length' in (v as any) &&
      Number.isInteger((v as any).length) &&
      (v as any).length >= 0
    )
  }

  /** Type guard for flat numeric arrays (1D) */
  static isFlatNumberArray(v: unknown): v is ArrayLike<number> {
    return (
      Conversion.isArrayLike(v) &&
      ((v as any).length === 0 || typeof (v as any)[0] === 'number')
    )
  }

  /** Type guard for nested numeric arrays (2D matrix) */
  static isNestedNumberArray(v: unknown): v is ArrayLike<ArrayLike<number>> {
    return (
      Conversion.isArrayLike(v) &&
      (v as any).length > 0 &&
      Conversion.isArrayLike((v as any)[0]) &&
      ((v as any)[0].length === 0 || typeof (v as any)[0][0] === 'number')
    )
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
  ): v is Vector<N> {
    return v instanceof Vector && v.length === dimension
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
      const row = array[i] as ArrayLike<number>
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
      const row = new Array(dimension) as FixedArray<number, N>
      for (let d = 0; d < dimension; d++) {
        row[d] = array[i + d]
      }
      result.push(row)
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

    const result = new Array(dimension) as FixedNumberArray<N>
    for (let i = 0; i < dimension; i++) {
      result[i] = array[i]
    }
    return result
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
        const vectorData: number[] = new Array(dimension)
        for (let d = 0; d < dimension; d++) {
          vectorData[d] = array[i + d]
        }
        result.push(vec<N>(...vectorData))
      }
      return result
    }

    // Handle nested array: each sub-array becomes a vector
    if (Conversion.isNestedNumberArray(array)) {
      if (this.isVector(array[0], dimension)) {
        return array as Vector<N>[]
      }
      const result: Vector<N>[] = []
      for (let i = 0; i < array.length; i++) {
        const row = array[i] as ArrayLike<number>
        if (row.length !== dimension) {
          throw new Error(
            `Row ${i} has length ${row.length}, expected dimension ${dimension}`,
          )
        }

        const vectorData: number[] = new Array(dimension)
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
      return bounds as FlatBounds<N>
    }

    // Convert [[min1, max1], [min2, max2], ...] to [min1, max1, min2, max2, ...]
    const boundsArray = bounds as ArrayLike<[number, number]>
    const result: number[] = []
    for (let i = 0; i < boundsArray.length; i++) {
      const bound = boundsArray[i] as [number, number]
      result.push(bound[0], bound[1])
    }
    return result as FlatBounds<N>
  }
}
