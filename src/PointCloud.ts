import { Delaunay as D3Delaunay } from 'd3-delaunay'
import { FixedArray, FlatBounds } from './types'
import { Conversion } from './Conversion'

const MAX_SAMPLING_LIMIT = 1_000_000

/**
 * A set of points in N dimensional space
 *
 * uses a `Float64Array` internally to store points
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
    /** return a number between 0-1 for the probability it gets added given a coordinate */
    samplingDistribution?: (...coords: FixedArray<number, N>) => number,
  ) {
    const points = new Float64Array(dimension * amount)

    if (typeof samplingDistribution === 'undefined') {
      for (let i = 0; i < amount * dimension; i += dimension) {
        console.log(i)
        for (let d = 0; d < dimension; d++) {
          const min = bounds[d * 2] as number
          const max = bounds[d * 2 + 1] as number
          points[i + d] = min + Math.random() * (max - min)
        }
      }
    } else {
      n: for (let i = 0; i < amount * dimension; i += dimension) {
        let j = 0
        while (j < MAX_SAMPLING_LIMIT) {
          const p = new Array(dimension) as FixedArray<number, N>
          for (let d = 0; d < dimension; d++) {
            const min = bounds[d * 2] as number
            const max = bounds[d * 2 + 1] as number
            p[d] = min + Math.random() * (max - min)
          }

          if (samplingDistribution(...p) > Math.random()) {
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

  static randomIntegerSampling<N extends number = 2>(
    /** Amount of random points to generate */
    amount: number,
    bounds: FlatBounds<N>, // [min1, max1, min2, max2, ...] - bounds will be floored/ceiled to integers
    dimension: N = 2 as N,
    /** return a number between 0-1 for the probability it gets added given a coordinate */
    samplingDistribution?: (...coords: FixedArray<number, N>) => number,
  ) {
    const points = new Float64Array(dimension * amount)

    if (typeof samplingDistribution === 'undefined') {
      for (let i = 0; i < amount * dimension; i += dimension) {
        for (let d = 0; d < dimension; d++) {
          const min = Math.ceil(bounds[d * 2] as number)
          const max = Math.floor(bounds[d * 2 + 1] as number)
          // Generate random integer between min and max (inclusive)
          points[i + d] = Math.floor(Math.random() * (max - min)) + min
        }
      }
    } else {
      n: for (let i = 0; i < amount * dimension; i += dimension) {
        let j = 0
        while (j < MAX_SAMPLING_LIMIT) {
          const p = new Array(dimension) as FixedArray<number, N>
          for (let d = 0; d < dimension; d++) {
            const min = Math.ceil(bounds[d * 2] as number)
            const max = Math.floor(bounds[d * 2 + 1] as number)
            // Generate random integer between min and max (inclusive)
            p[d] = Math.floor(Math.random() * (max - min)) + min
          }

          if (samplingDistribution(...p) > Math.random()) {
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

  // TODO: add method overloading FixedNumberArray<N>[], FLoat64Array
  static create<N extends number = 2>(
    points: ArrayLike<number> | ArrayLike<ArrayLike<number>> | Float64Array,
    dimension: N = 2 as N,
  ) {
    points = Conversion.toFloat64Array(points, dimension)
    return new PointCloud<N>(points as Float64Array, dimension)
  }

  private constructor(
    private points: Float64Array,
    private dimensions: N,
  ) {}

  get size() {
    return this.points.length / this.dimensions
  }

  private clearCache() {
    this._delaunay = undefined
    this._voronoi = undefined
  }

  /** Set a point at a specfic index */
  setPoint(index: number, point: FixedArray<number, N>) {
    if (index < 0 || index >= this.size) {
      throw new Error(`Point index ${index} out of bounds (0-${this.size - 1})`)
    }

    this.points.set(point, index * this.dimensions)
  }

  /** Get a specific point by index */
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

  /**
   * Filters points based on a predicate function and returns a new PointCloud
   */
  filter(
    predicate: (point: FixedArray<number, N>, index: number) => boolean,
  ): PointCloud<N> {
    const filteredPoints: FixedArray<number, N>[] = []

    for (let i = 0; i < this.size; i++) {
      const point = this.getPoint(i)
      if (predicate(point, i)) {
        filteredPoints.push(point)
      }
    }

    return PointCloud.create(filteredPoints, this.dimensions)
  }

  /**
   * Applies a transformation to each point in place (mutates the current PointCloud)
   * Returns this for method chaining
   */
  transform(
    callback: (
      point: FixedArray<number, N>,
      index: number,
    ) => FixedArray<number, N>,
  ): this {
    for (let i = 0; i < this.size; i++) {
      const originalPoint = this.getPoint(i)
      const newPoint = callback(originalPoint, i)

      for (let d = 0; d < this.dimensions; d++) {
        this.points[i * this.dimensions + d] = newPoint[d]
      }
    }

    this.clearCache()

    return this
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
    tolerance: number = 0.1,
    /**
     * Make it weighted, giving a certain bias towards a certain values
     * @returns a number between 0-1 giving the weight of that point
     * */
    weight: (x: number, y: number) => number = () => 1,
  ): Float64Array {
    // inspiration: https://observablehq.com/@mbostock/voronoi-stippling
    if (this.dimensions !== 2) {
      throw new Error('Lloyd algorithm currently only supports 2D points')
    }

    const [xmin, xmax, ymin, ymax] = bounds

    for (let iter = 0; iter < iterations; iter++) {
      const delaunay = D3Delaunay.from(this.points) as Delaunay
      const vor = delaunay.voronoi([xmin, ymin, xmax, ymax])

      let totalMove = 0
      for (let i = 0; i < this.points.length; i++) {
        const cell = vor.cellPolygon(i) as [number, number][]
        if (!cell) continue
        const [cx, cy] = centroidOfPolygon(cell, weight)
        console.log(cx, cy)
        const dx = cx - this.points[i][0]
        const dy = cy - this.points[i][1]
        totalMove += Math.hypot(dx, dy)
        this.points[i][0] = cx
        this.points[i][1] = cy
      }

      const avgMove = totalMove / this.points.length
      console.log(avgMove)
      if (avgMove < tolerance) return this.points
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

// Compute density-weighted centroid of a polygon region
function centroidOfPolygon(
  polygon: [number, number][],
  density: (x: number, y: number) => number = () => 1,
): FixedArray<number, 2> {
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map((p) => p[0]))))
  const maxX = Math.min(
    this.width - 1,
    Math.ceil(Math.max(...polygon.map((p) => p[0]))),
  )
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map((p) => p[1]))))
  const maxY = Math.min(
    this.height - 1,
    Math.ceil(Math.max(...polygon.map((p) => p[1]))),
  )

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
