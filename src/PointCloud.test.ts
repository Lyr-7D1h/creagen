import { expect, test } from 'vitest'
import { PointCloud } from './PointCloud'
import { vec } from './Vector'

const toArray = (point: ArrayLike<number>) => Array.from(point)

test('create', () => {
  const v = [1, 2, 1, 4]
  PointCloud.create(v, 2)
  PointCloud.create(new Float64Array([1, 2, 1, 4]), 2)
  PointCloud.create(vec(1, 2), 1)
  PointCloud.create([vec(1, 2, 3), vec(1, 3, 4)], 3)
  PointCloud.create(
    [
      [1, 2, 3],
      [1, 3, 4],
    ],
    3,
  )
  PointCloud.create(
    [
      [1, 2, 3],
      [2, 3, 5],
    ],
    3,
  )
})

test('gridSampling', () => {
  const points = PointCloud.grid([2, 3], [0, 1, 10, 20], 2).toArray()
  expect(points.length).toBe(6)
  expect(toArray(points[0])).toEqual([0, 10])
  expect(toArray(points[1])).toEqual([0, 15])
  expect(toArray(points[2])).toEqual([0, 20])
  expect(toArray(points[3])).toEqual([1, 10])
  expect(toArray(points[4])).toEqual([1, 15])
  expect(toArray(points[5])).toEqual([1, 20])

  const single = PointCloud.grid(1, [-2, 2], 1).toArray()
  expect(single.map(toArray)).toEqual([[0]])
})

test('iterator yields distinct arrays', () => {
  const cloud = PointCloud.create([0, 1, 2, 3], 2)
  const points = Array.from(cloud)

  expect(points.length).toBe(2)
  expect(toArray(points[0])).toEqual([0, 1])
  expect(toArray(points[1])).toEqual([2, 3])
  expect(points[0]).not.toBe(points[1])
})

test('iterator points are independent', () => {
  const cloud = PointCloud.create([0, 1, 2, 3], 2)
  const points = Array.from(cloud)

  points[0][0] = 99

  expect(toArray(points[0])).toEqual([99, 1])
  expect(toArray(points[1])).toEqual([2, 3])
})
