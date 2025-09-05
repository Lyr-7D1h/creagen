import { test } from 'vitest'
import { PointCloud } from './PointCloud'
import { vec } from './Vector'

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
