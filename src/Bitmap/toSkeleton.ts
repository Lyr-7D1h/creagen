import { Delaunay as D3Delaunay } from 'd3-delaunay'
import { Bitmap } from '../Bitmap'
import { Delaunay } from '../PointCloud'

// TODO: Look into https://www.npmjs.com/package/flo-mat
// TODO: move into Image and use marchingsquares
export function toSkeleton(map: Bitmap) {
  const boundaryPoints = map.boundaryPoints()
  const delaunay = D3Delaunay.from(boundaryPoints) as Delaunay
  const voronoi = delaunay.voronoi([0, 0, map.width, map.height])

  const seen = new Set()
  const medialEdges: [number, number][] = []
  for (let i = 0; i < boundaryPoints.length; i++) {
    const cell = voronoi.cellPolygon(i)
    if (!cell) continue
    for (const [x, y] of cell) {
      const key = x + ',' + y
      if (seen.has(key)) continue

      const add = (x, y, x0, y0) => {
        if (!map.bounds(x0, y0) || !map.get(x0, y0)) return false
        seen.add(key)
        medialEdges.push([x, y])
        return true
      }

      if (
        hasHalfFraction(x) &&
        (add(x, y, Math.round(x - 0.01), Math.round(y)) ||
          add(x, y, Math.round(x + 0.01), Math.round(y)))
      ) {
        continue
      }
      if (
        hasHalfFraction(y) &&
        (add(x, y, Math.round(x), Math.round(y - 0.01)) ||
          add(x, y, Math.round(x), Math.round(y + 0.01)))
      ) {
        continue
      }

      add(x, y, Math.round(x), Math.round(y))
    }
  }
  return medialEdges
}

function hasHalfFraction(n: number) {
  const frac = Math.abs(n % 1)
  return 0.49 < frac && frac < 0.51
}
