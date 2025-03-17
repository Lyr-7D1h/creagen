import { Vector } from './Vector'

export function matrix() {}

// https://www.npmjs.com/package/ml-matrix
export class Matrix<R extends number, C extends number> {
  public readonly rows: R
  public readonly cols: C
  private elements: number[]

  static create() {}

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
    this.elements[row][col] = value
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

    let det = 0

    if (this.rows === 2) {
      det =
        this.elements[0] * this.elements[3] -
        this.elements[1] * this.elements[2]
      return det
    }

    throw Error('unimplemented')
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
