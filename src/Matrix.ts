import * as Math from './math'
import { Vector } from './Vector'

export function matrix() {}

// https://www.npmjs.com/package/ml-matrix
export class Matrix<R extends number, C extends number> {
  public readonly rows: R
  public readonly cols: C
  private elements: number[]

  static identity<R extends number>(size: R) {
    const m = new Matrix<R, R>(new Array(size * size).fill(0), size, size)
    for (let i = 0; i < size; i++) {
      m.elements[i * size + i] = 1
    }
    return m
  }

  static empty<R extends number, C extends number>(rows: R, cols: C) {
    return new Matrix<R, C>(new Array(rows * cols).fill(0), rows, cols)
  }

  static create<R extends number, C extends number>(
    elements: number[],
    rows: R,
    cols: C,
  ) {
    return new Matrix<R, C>(elements, rows, cols)
  }

  constructor(elements: number[], rows: R, cols: C)
  constructor(...rows: (number[] & { length: C })[] & { length: R })
  constructor(rows: (number[] & { length: C })[] & { length: R })
  constructor(...args: number[][] | number[][][]) {
    if (typeof args[1] === 'number' && typeof args[2] === 'number') {
      this.elements = args[0] as number[]
      this.rows = args[1]
      this.cols = args[2]
    } else if (args[0].length > 0 && Array.isArray(args[0][0])) {
      // [ [[1, 2], [3, 4]] ]
      this.elements = args[0].flat() as number[]
      this.rows = args[0].length as R
      this.cols = args[0][0].length as C
    } else {
      // [[1, 2], [3, 4]]
      this.elements = args.flat() as number[]
      this.rows = args.length as R
      this.cols = args[0].length as C
    }

    if (this.elements.length !== this.rows * this.cols)
      throw new Error(`Elements must equal ${this.rows * this.cols}`)
    if (this.elements.length === 0)
      throw new Error('Matrix must have at least one element')
  }

  get length() {
    return this.elements.length
  }

  /** Return a copy of the row vector */
  get(row: number): Vector<C>
  /** Get a value of the matrix */
  get(row: number, col: number): number
  get(row: number, col?: number): number | Vector<C> {
    if (col === undefined) {
      return new Vector<C>(
        ...this.elements.slice(row * this.cols, row * this.cols + this.cols),
      )
    }
    return this.elements[row * this.rows + col]
  }

  set(row: number, col: number, value: number): void {
    this.elements[row * this.cols + col] = value
  }

  *col(col: number): Generator<number, this> {
    let i = 0
    while (i < this.rows) {
      yield this.get(i, col)
      i++
    }
    return this
  }

  clone(): Matrix<R, C> {
    return new Matrix<R, C>(this.elements, this.rows, this.cols)
  }

  /** https://en.wikipedia.org/wiki/Determinant */
  determinant(): number {
    if ((this.rows as number) !== (this.cols as number)) {
      throw new Error('Matrix must be square')
    }

    if (this.rows === 2) {
      return (
        this.elements[0] * this.elements[3] -
        this.elements[1] * this.elements[2]
      )
    }

    // PERF: calculate only diagonals of U instead of L, U, P
    // PERF: implement Bareiss Algorithm for integer only matrices which is division free
    return this.lup()[1].diag()
  }

  /** Multiply diagonal of matrix */
  diag(): number {
    let res = 1
    for (let i = 0; i < this.rows; i++) {
      res *= this.elements[i * this.cols + i]
    }
    return res
  }

  swapRows(i: number, j: number) {
    if (i === j) return this
    for (let col = 0; col < this.cols; col++) {
      const temp = this.get(i, col)
      this.set(i, col, this.get(j, col))
      this.set(j, col, temp)
    }
    return this
  }

  roundToDec(decimal: number) {
    for (let i = 0; i < this.length; i++) {
      this.elements[i] = Math.roundToDec(this.elements[i], decimal)
    }
    return this
  }

  /**
   * [LU factorization with partial pivoting](https://en.wikipedia.org/wiki/LU_decomposition#LU_factorization_with_partial_pivoting)
   *
   * Returns [L, U, P] such that PA = LU
   * */
  lup(): [Matrix<R, R>, Matrix<R, R>, Matrix<R, R>] {
    if ((this.rows as number) !== (this.cols as number)) {
      throw new Error('Matrix must be square')
    }

    const n = this.rows
    const L = Matrix.identity(n)
    const U = this.clone() as unknown as Matrix<R, R>
    const P = Matrix.identity(n)

    for (let pivot = 0; pivot < this.cols; pivot++) {
      let max = 0
      let maxIndex = pivot
      for (let col = pivot; col < this.rows; col++) {
        const value = Math.abs(this.get(col, pivot))
        if (value > max) {
          max = value
          maxIndex = col
        }
      }

      // if no absolute value is greater than 0 skip since there is no pivot
      if (max === 0) {
        continue
      }

      // put row with biggest pivot on top for numerical stability
      if (maxIndex !== pivot) {
        this.swapRows(pivot, maxIndex)
        P.swapRows(pivot, maxIndex)
      }

      // set the scalar factor in L
      for (let i = pivot + 1; i < this.rows; i++) {
        const factor = U.get(i, pivot) / U.get(pivot, pivot)
        L.set(i, pivot, factor)
        for (let j = pivot; j < this.cols; j++) {
          U.set(i, j, U.get(i, j) - factor * U.get(pivot, j))
        }
      }
    }

    return [L, U, P]
  }

  /** Create a string representation of this matrix */
  toString(): string {
    let res = ''
    for (let i = 0; i < this.elements.length; i++) {
      res += this.elements[i] + ' '
      if ((i + 1) % this.cols === 0) {
        res = res.slice(0, -1)
        res += '\n'
      }
    }
    return res.trimEnd()
  }
}
