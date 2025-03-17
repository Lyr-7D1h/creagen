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
  let matrix4 = new Matrix<4, 2>([
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
