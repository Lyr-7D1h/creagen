import {
  Delaunay as D3Delaunay,
  type Delaunay,
  type Voronoi,
} from 'd3-delaunay'
import { Conversion } from './Conversion'
import { lloydsAlgorithm } from './PointCloud/Lloyd'
import { poissonDiscSampler } from './PointCloud/PoissonDiscSampler'
import type {
  FixedArray,
  FixedFloat64Array,
  FixedNumberArray,
  FlatBounds,
} from './types'

const MAX_SAMPLING_ITERATION_LIMIT = 1_000_000

/**
 * A set of points in N dimensional space
 *
 * uses a `Float64Array` internally to store points
 */
export class PointCloud<N extends number> {
  // Cached values
  _delaunay?: Delaunay
  _voronoi?: Voronoi

  /**
   * Generate a set of points where each point has a minimum distance `minimumDistance` from any other point filling up the space within `bounds`
   *
   * This uses a modified version of [Bridson's Algorithm](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf)
   * , [visualized](https://observablehq.com/@techsparx/an-improvement-on-bridsons-algorithm-for-poisson-disc-samp/2)
   * */
  // TODO: multiple dimensions https://dl.acm.org/doi/10.1145/1278780.1278807
  static poissonRandomDiskSampling(
    minimumDistance: number,
    bounds: FlatBounds<2>,
  ) {
    // Create a properly sized Float64Array with the actual number of coordinates
    const points = new Float64Array(poissonDiscSampler(minimumDistance, bounds))
    return new PointCloud<2>(points, 2)
  }

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
        for (let d = 0; d < dimension; d++) {
          const min = bounds[d * 2]
          const max = bounds[d * 2 + 1]
          points[i + d] = min + Math.random() * (max - min)
        }
      }
    } else {
      n: for (let i = 0; i < amount * dimension; i += dimension) {
        let j = 0
        while (j < MAX_SAMPLING_ITERATION_LIMIT) {
          const p = new Array(dimension) as FixedArray<number, N>
          for (let d = 0; d < dimension; d++) {
            const min = bounds[d * 2]
            const max = bounds[d * 2 + 1]
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
          const min = Math.ceil(bounds[d * 2])
          const max = Math.floor(bounds[d * 2 + 1])
          // Generate random integer between min and max (inclusive)
          points[i + d] = Math.floor(Math.random() * (max - min)) + min
        }
      }
    } else {
      n: for (let i = 0; i < amount * dimension; i += dimension) {
        let j = 0
        while (j < MAX_SAMPLING_ITERATION_LIMIT) {
          const p = new Array(dimension) as FixedArray<number, N>
          for (let d = 0; d < dimension; d++) {
            const min = Math.ceil(bounds[d * 2])
            const max = Math.floor(bounds[d * 2 + 1])
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

  static grid<N extends number = 2>(
    /** Number of points per dimension */
    counts: number | FixedNumberArray<N>,
    /** [min1, max1, min2, max2, ...] */
    bounds: FlatBounds<N>,
    dimension: N = 2 as N,
  ) {
    const perDimensionCounts = new Array(dimension) as FixedArray<number, N>
    for (let d = 0; d < dimension; d++) {
      const count: number = typeof counts === 'number' ? counts : counts[d]
      if (!Number.isFinite(count) || count < 1) {
        throw new Error('Grid counts must be finite numbers >= 1')
      }
      perDimensionCounts[d] = Math.floor(count)
    }

    const steps = new Array(dimension) as FixedArray<number, N>
    let totalPoints = 1
    for (let d = 0; d < dimension; d++) {
      const min = bounds[d * 2]
      const max = bounds[d * 2 + 1]
      if (max < min) {
        throw new Error('Grid bounds must have max >= min for each dimension')
      }

      const count = perDimensionCounts[d]
      steps[d] = count > 1 ? (max - min) / (count - 1) : 0
      totalPoints *= count
    }

    const points = new Float64Array(totalPoints * dimension)
    const indices = new Array(dimension).fill(0)

    for (let i = 0; i < totalPoints; i++) {
      for (let d = 0; d < dimension; d++) {
        const min = bounds[d * 2]
        const max = bounds[d * 2 + 1]
        const count = perDimensionCounts[d]
        points[i * dimension + d] =
          count > 1 ? min + indices[d] * steps[d] : (min + max) / 2
      }

      for (let d = dimension - 1; d >= 0; d--) {
        indices[d] += 1
        if (indices[d] < perDimensionCounts[d]) break
        indices[d] = 0
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

  /** Returns the amount of points in the point cloud */
  readonly size: number
  private constructor(
    private points: Float64Array,
    private readonly dimensions: N,
  ) {
    this.size = this.points.length / this.dimensions
  }

  /**
   * Iterator implementation - allows for...of loops over points
   */
  *[Symbol.iterator](): Iterator<FixedFloat64Array<N>> {
    for (let i = 0; i < this.size; i++) {
      const start = i * this.dimensions
      const p = new Float64Array(this.dimensions) as FixedFloat64Array<N>
      p.set(this.points.subarray(start, start + this.dimensions))
      yield p
    }
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
  at(index: number): FixedFloat64Array<N> {
    if (index < 0 || index >= this.size) {
      throw new Error(`Point index ${index} out of bounds (0-${this.size - 1})`)
    }

    const start = index * this.dimensions
    const point = new Float64Array(this.dimensions) as FixedFloat64Array<N>
    point.set(this.points.subarray(start, start + this.dimensions))
    return point
  }

  /**
   * Returns an array of all points
   */
  toArray(): FixedFloat64Array<N>[] {
    return Array.from(this)
  }

  /**
   * Filters points based on a predicate function and returns a new PointCloud
   */
  filter(
    predicate: (point: FixedFloat64Array<N>, index: number) => boolean,
  ): PointCloud<N> {
    const filteredPoints: FixedFloat64Array<N>[] = []

    for (let i = 0; i < this.size; i++) {
      const point = this.at(i)
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
      point: FixedFloat64Array<N>,
      index: number,
    ) => FixedArray<number, N>,
  ): this {
    for (let i = 0; i < this.size; i++) {
      const originalPoint = this.at(i)
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
    this._delaunay = new D3Delaunay(this.points)
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
   * @param tolerance When average movement per iteration is lower than this amount it will stop iterating if `undefined` it is calculated based on boundary size
   * @param weight Make it weighted, giving a certain bias towards certain values, this is basically [Voronoi Weighted Stippling](https://www.cs.ubc.ca/labs/imager/tr/2002/secord2002b/secord.2002b.pdf) when used with a random sampling technique like [Rejection Sampling](https://en.wikipedia.org/wiki/Rejection_sampling) for getting points on darker/lighter parts of an image @returns a number between 0-1 giving the weight of that point
   *
   * @returns The updated points array
   */
  lloyd(
    this: PointCloud<2>,
    bounds: FlatBounds<2>,
    iterations: number = 1,
    tolerance?: number,
    weight: (x: number, y: number) => number = () => 1,
  ) {
    // inspiration: https://observablehq.com/@mbostock/voronoi-stippling
    // Runtime check is now redundant due to type constraint, but keeping for safety
    if (this.dimensions !== 2) {
      throw new Error('Lloyd algorithm currently only supports 2D points')
    }

    lloydsAlgorithm(this.points, bounds, iterations, tolerance, weight)

    return this
  }
}
