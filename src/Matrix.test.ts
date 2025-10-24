import { expect, test } from 'vitest'
import { Matrix } from './Matrix'
import { Vector } from './Vector'

test('get', () => {
  let matrix = new Matrix<2, 2>([1, 2], [3, 4])
  expect(matrix.get(0)).toEqual([1, 2])
  expect(matrix.get(1)).instanceOf(Vector)
  expect(matrix.get(0, 1)).toBe(2)
  expect(matrix.rows).toBe(2)
  expect(matrix.cols).toBe(2)
  matrix = new Matrix([1, 2, 3, 4], 2, 2)
  expect(matrix.get(0)).toEqual([1, 2])
  expect(matrix.get(1)).instanceOf(Vector)
  expect(matrix.get(0, 1)).toBe(2)
  expect(matrix.rows).toBe(2)
  expect(matrix.cols).toBe(2)
  matrix = new Matrix<2, 2>([
    [1, 2],
    [3, 4],
  ])
  expect(matrix.get(0)).toEqual([1, 2])
  expect(matrix.get(1)).instanceOf(Vector)
  expect(matrix.get(0, 1)).toBe(2)
  expect(matrix.rows).toBe(2)
  expect(matrix.cols).toBe(2)
  expect(matrix.length).toBe(4)
  const matrix4 = new Matrix<4, 2>([
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
  ])
  expect(matrix4.get(0)).toEqual([1, 2])
  expect(matrix4.get(1)).instanceOf(Vector)
  expect(matrix4.get(0, 1)).toBe(2)
  expect(matrix4.rows).toBe(4)
  expect(matrix4.cols).toBe(2)
  expect(matrix4.length).toBe(8)
})

test('toString', () => {
  // prettier-ignore
  const matrix = new Matrix(
    [1, 2, 3], 
    [3, 4, 5]
  )
  expect(matrix.toString()).toBe('1 2 3\n3 4 5')
})

test('determinant', () => {
  const matrix = new Matrix([1, 2], [3, 4])
  expect(matrix.determinant()).toBe(-2)
})

test('col', () => {
  const matrix = new Matrix([1, 2], [3, 4])
  expect([...matrix.col(0)]).toEqual([1, 3])
  expect([...matrix.col(1)]).toEqual([2, 4])
})

test('determinant', () => {
  const matrix = new Matrix([
    [0, 1, 2],
    [-1, -2, -3],
    [-6, -8, -4],
  ])
  expect(matrix.determinant()).toBe(6)
})

test('lup', () => {
  // https://www.wolframalpha.com/input?i2d=true&i=%7B%7B0%2C1%2C2%7D%2C%7B-1%2C-2%2C-3%7D%2C%7B-6%2C-8%2C-4%7D%7D+lu+decompo
  const matrix = new Matrix([
    [0, 1, 2],
    [-1, -2, -3],
    [-6, -8, -4],
  ])
  const [L, U, P] = matrix.lup()
  expect(L.roundToDec(17)).toStrictEqual(
    new Matrix([
      [1, 0, 0],
      [1 / 6, 1, 0],
      [0, -0.6666666666666667, 1], // account for rounding errors
    ]),
  )
  expect(U).toStrictEqual(
    new Matrix([
      [-6, -8, -4],
      [0, 1, 2],
      [0, 0, -1],
    ]),
  )
  expect(P).toStrictEqual(
    new Matrix([
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
    ]),
  )
})
