import { quadtree, type Quadtree } from 'd3-quadtree'
import type { FixedNumberArray } from './types'
export class QuadTree {
  points: FixedNumberArray<2>[]
  tree: Quadtree<FixedNumberArray<2>>

  constructor(points: FixedNumberArray<2>[]) {
    this.points = points
    this.tree = quadtree(points)
  }

  nearest(index: number, radius?: number): FixedNumberArray<2> | undefined {
    const [x, y] = this.points[index]
    return this.tree.search?.(x, y, radius)
  }
}
