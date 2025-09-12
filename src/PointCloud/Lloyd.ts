import { Delaunay as D3Delaunay } from 'd3-delaunay'
import { FixedArray, FlatBounds } from '../types'
import { Delaunay } from '../PointCloud'

/**
 * [Lloyd's Algorithm (Voronoi Relaxation)](https://en.wikipedia.org/wiki/Lloyd%27s_algorithm)
 *
 * Iteratively moves each point to the centroid of its Voronoi cell to create
 * a more uniform distribution. This requires bounds to be specified.
 *
 * @param bounds [xmin, ymin, xmax, ymax] - The bounds for the point cloud
 * @param iterations Number of Lloyd iterations to perform (default: 1)
 * @returns The updated points array
 */
export function lloydsAlgorithm(
  points: Float64Array,
  bounds: FlatBounds<2>,
  iterations: number = 1,
  tolerance?: number,
  weight: (x: number, y: number) => number = () => 1,
) {
  const dimension = 2
  const size = points.length / dimension
  const [xmin, xmax, ymin, ymax] = bounds

  // Calculate adaptive tolerance based on bounds size if not provided
  const actualTolerance =
    tolerance ?? Math.min(xmax - xmin, ymax - ymin) * 0.001

  for (let iter = 0; iter < iterations; iter++) {
    const delaunay = new D3Delaunay(points) as Delaunay
    delaunay.update()
    const vor = delaunay.voronoi([xmin, ymin, xmax, ymax])

    let totalMove = 0
    for (let i = 0; i < size; i++) {
      const cell = vor.cellPolygon(i)
      if (!cell) {
        continue
      }
      const [cx, cy] = centroidOfPolygon(cell, weight)

      const pointIndex = i * dimension
      const currentX = points[pointIndex]
      const currentY = points[pointIndex + 1]

      const dx = cx - currentX
      const dy = cy - currentY
      totalMove += Math.hypot(dx, dy)

      points[pointIndex] = cx
      points[pointIndex + 1] = cy
    }

    const avgMove = totalMove / size
    if (avgMove < actualTolerance) return
  }

  return
}

// Compute density-weighted centroid of a polygon region
function centroidOfPolygon(
  polygon: [number, number][],
  density: (x: number, y: number) => number = () => 1,
): FixedArray<number, 2> {
  const minX = Math.floor(Math.min(...polygon.map((p) => p[0])))
  const maxX = Math.ceil(Math.max(...polygon.map((p) => p[0])))
  const minY = Math.floor(Math.min(...polygon.map((p) => p[1])))
  const maxY = Math.ceil(Math.max(...polygon.map((p) => p[1])))

  let sumX = 0,
    sumY = 0,
    sumW = 0
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPolygon(x + 0.5, y + 0.5, polygon)) {
        const rho = density(x, y)
        sumW += rho
        sumX += rho * (x + 0.5)
        sumY += rho * (y + 0.5)
      }
    }
  }
  if (sumW === 0) return [polygon[0][0], polygon[0][1]]
  return [sumX / sumW, sumY / sumW]
}

// Ray-casting point-in-polygon
function pointInPolygon(
  x: number,
  y: number,
  poly: [number, number][],
): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0],
      yi = poly[i][1]
    const xj = poly[j][0],
      yj = poly[j][1]
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi
    if (intersect) inside = !inside
  }
  return inside
}
