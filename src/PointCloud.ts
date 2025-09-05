import { Delaunay as D3Delaunay } from 'd3-delaunay'
import { FixedArray } from './Vector'

// Type-level arithmetic to multiply N by 2 using tuple manipulation
type Tuple<
  N extends number,
  R extends readonly unknown[] = [],
> = R['length'] extends N ? R : Tuple<N, readonly [...R, unknown]>

type Multiply2<N extends number> = [
  ...Tuple<N>,
  ...Tuple<N>,
]['length'] extends number
  ? [...Tuple<N>, ...Tuple<N>]['length']
  : never

/** Type for flat bounds array: [min1, max1, min2, max2, ..., minN, maxN] */
type FlatBounds<N extends number> = FixedArray<number, Multiply2<N>>

/**
 * A set of points in N dimensional space
 */
export class PointCloud<N extends number> {
  // Cached values
  _delaunay?: Delaunay
  _voronoi?: Voronoi

  static randomFloatSampling<N extends number = 2>(
    /** Amount of random points to generate */
    amount: number,
    bounds: FlatBounds<N>, // [min1, max1, min2, max2, ...]
    dimension: N = 2 as N,
    sampling?: (...coords: FixedArray<number, N>) => boolean,
  ) {
    const points = new Float64Array(dimension * amount)

    if (typeof sampling === 'undefined') {
      for (let i = 0; i < amount; i += dimension) {
        for (let d = 0; d < dimension; d++) {
          const min = bounds[d * 2] as number
          const max = bounds[d * 2 + 1] as number
          points[i + d] = min + Math.random() * (max - min)
        }
      }
    } else {
      n: for (let i = 0; i < amount; i += dimension) {
        let j = 0
        while (j < 100000) {
          const p = new Array(dimension) as FixedArray<number, N>
          for (let d = 0; d < dimension; d++) {
            const min = bounds[d * 2] as number
            const max = bounds[d * 2 + 1] as number
            p[d] = min + Math.random() * (max - min)
          }

          if (sampling(...p)) {
            points.set(p, i)
            continue n
          }
          j += 1
        }
        throw Error('Maximum sampling iteration exceeded')
      }
    }

    return new PointCloud<N>(points, dimension)
  }

  static create<N extends number = 2>(
    points: FixedArray<number, N>[] | Float64Array,
    dimension: N = 2 as N,
  ) {
    // Convert points to Float64Array if needed
    if (!(points instanceof Float64Array)) {
      const pointsFloat = new Float64Array(points.length * dimension)
      for (let i = 0; i < points.length; i++) {
        for (let d = 0; d < dimension; d++) {
          pointsFloat[i * dimension + d] = points[i][d]
        }
      }
      points = pointsFloat
    }

    return new PointCloud<N>(points, dimension)
  }

  private constructor(
    private points: Float64Array,
    private dimensions: N,
  ) {}

  get size() {
    return this.points.length / this.dimensions
  }

  /**
   * Get a specific point by index
   */
  getPoint(index: number): FixedArray<number, N> {
    if (index < 0 || index >= this.size) {
      throw new Error(`Point index ${index} out of bounds (0-${this.size - 1})`)
    }

    const point = new Array(this.dimensions) as FixedArray<number, N>
    for (let d = 0; d < this.dimensions; d++) {
      point[d] = this.points[index * this.dimensions + d]
    }
    return point
  }

  /**
   * Iterator implementation - allows for...of loops over points
   */
  *[Symbol.iterator](): Iterator<FixedArray<number, N>> {
    for (let i = 0; i < this.size; i++) {
      yield this.getPoint(i)
    }
  }

  /**
   * Returns an array of all points
   */
  toArray(): FixedArray<number, N>[] {
    return Array.from(this)
  }

  delaunay(): Delaunay {
    if (this._delaunay) return this._delaunay
    this._delaunay = D3Delaunay.from(this.points)
    return this._delaunay
  }

  voronoi(bounds: FlatBounds<2>): Voronoi {
    if (this._voronoi) return this._voronoi
    this._voronoi = this.delaunay().voronoi(bounds)
    return this._voronoi
  }

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
  lloyd(
    bounds: FlatBounds<2>,
    iterations: number = 1,
    /**
     * Make it weighted, giving a certain bias towards a certain values
     * @returns a number between 0-1 giving the weight of that point
     * */
    weight?: (x: number, y: number) => number,
  ): Float64Array {
    if (this.dimensions !== 2) {
      throw new Error('Lloyd algorithm currently only supports 2D points')
    }

    const [xmin, xmax, ymin, ymax] = bounds
    const n = this.size

    // Get amount of samples to take from centroids
    const sampleDensity = 100 // samples per unit area
    const totalArea = (xmax - xmin) * (ymax - ymin)
    const numSamples = Math.max(1000, Math.floor(totalArea * sampleDensity))

    for (let iter = 0; iter < iterations; iter++) {
      const delaunay = this.delaunay()

      // Calculate centroids for each Voronoi cell
      const centroids = new Float64Array(n * 2)
      const areas = new Float64Array(n)

      for (let i = 0; i < numSamples; i++) {
        const x = xmin + Math.random() * (xmax - xmin)
        const y = ymin + Math.random() * (ymax - ymin)

        // Find which Voronoi cell this sample point belongs to
        const cellIndex = delaunay.find(x, y, 0)

        if (cellIndex >= 0 && cellIndex < n) {
          const w = weight ? weight(x, y) : 1
          centroids[cellIndex * 2] += x * w
          centroids[cellIndex * 2 + 1] += y * w
          areas[cellIndex] += 1
        }
      }

      // Update points to centroids (where areas > 0)
      for (let i = 0; i < n; i++) {
        const area = areas[i]
        if (area > 0) {
          const newX = centroids[i * 2] / area
          const newY = centroids[i * 2 + 1] / area

          // Clamp to bounds
          this.points[i * 2] = Math.max(xmin, Math.min(xmax, newX))
          this.points[i * 2 + 1] = Math.max(ymin, Math.min(ymax, newY))
        }
      }

      // Update the triangulation after modifying points
      if (this._delaunay) {
        this._delaunay.update()
      }
    }

    return this.points
  }
}

export type Delaunay = {
  halfedges: Int32Array
  hull: Int32Array
  inedges: Int32Array
  points: Int32Array
  triangles: Int32Array
  voronoi: (bounds: FixedArray<number, 4>) => Voronoi
  find: (x: number, y: number, startingIndex: number) => number
  update: () => void
}
export type Voronoi = {
  circumcenters: Int32Array
  vectors: Int32Array
  delaunay: Delaunay
  cellPolygons: () => [number, number][][]
  cellPolygon: (i: number) => [number, number][]
}
