// import TraceSkeleton from 'skeleton-tracing-wasm'
import { Delaunay as D3Delaunay } from 'd3-delaunay'
import { vec, Vector } from './Vector'
import type { Delaunay } from './Voronoi'
// import { Voronoi } from './Voronoi'

export class Bitmap {
  static create(width: number, height: number) {
    return new Bitmap(
      width,
      height,
      new Uint8Array(Math.ceil((width * height) / 8)),
    )
  }

  static fromUnit8array(width, height, data: Uint8Array) {
    return new Bitmap(width, height, data)
  }

  constructor(
    private width,
    private height,
    private data: Uint8Array,
  ) {}

  // Compute bit index for (x, y)
  _index(x, y) {
    if (!this.bounds(x, y)) {
      throw new RangeError(`Coordinates (${x}, ${y}) out of bounds`)
    }
    return y * this.width + x
  }

  /** return if coordiantes are within bounds */
  bounds(x, y) {
    return !(x < 0 || x >= this.width || y < 0 || y >= this.height)
  }

  clone() {
    return new Bitmap(this.width, this.height, new Uint8Array(this.data))
  }

  // Get bit value at (x, y)
  get(x: number, y: number) {
    const i = this._index(x, y)
    const byteIndex = i >> 3 // divide by 8
    const bitIndex = i & 7 // modulo 8
    return ((this.data[byteIndex] >> bitIndex) & 1) > 0
  }

  // Set bit at (x, y) to value (0 or 1)
  set(x: number, y: number, value: boolean) {
    const i = this._index(x, y)
    const byteIndex = i >> 3
    const bitIndex = i & 7
    if (value) {
      this.data[byteIndex] |= 1 << bitIndex // set bit
    } else {
      this.data[byteIndex] &= ~(1 << bitIndex) // clear bit
    }
  }

  // Toggle bit at (x, y)
  toggle(x: number, y: number) {
    const i = this._index(x, y)
    const byteIndex = i >> 3
    const bitIndex = i & 7
    this.data[byteIndex] ^= 1 << bitIndex
  }

  // print bitmap (# for 1, . for 0)
  toPrettyString() {
    const out = []
    for (let y = 0; y < this.height; y++) {
      let row = ''
      for (let x = 0; x < this.width; x++) {
        row += this.get(x, y) ? '#' : '.'
      }
      out.push(row)
    }
    return out.join('\n')
  }

  /** Use zhangSuenThinning to this the image*/
  thin() {
    const height = this.height
    const width = this.width

    let changed = true
    let out = this.clone()

    while (changed) {
      changed = false

      for (let pass = 0; pass < 3; pass++) {
        const toRemove: [number, number][] = []

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const p = out.get(x, y)
            if (!p) continue

            // Neighbors clockwise: p2..p9
            const p2 = out.get(x, y - 1)
            const p3 = out.get(x + 1, y - 1)
            const p4 = out.get(x + 1, y)
            const p5 = out.get(x + 1, y + 1)
            const p6 = out.get(x, y + 1)
            const p7 = out.get(x - 1, y + 1)
            const p8 = out.get(x - 1, y)
            const p9 = out.get(x - 1, y - 1)

            const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9]
            const numNeighbors = neighbors.filter((n) => n).length

            if (numNeighbors < 2 || numNeighbors > 6) continue

            // Count 0->1 transitions in order
            let transitions = 0
            for (let i = 0; i < neighbors.length; i++) {
              const curr = neighbors[i]
              const next = neighbors[(i + 1) % neighbors.length]
              if (!curr && next) transitions++
            }
            if (transitions !== 1) continue

            if (pass === 0) {
              if (!((!p2 || !p4 || !p6) && (!p4 || !p6 || !p8))) continue
            } else {
              if (!((!p2 || !p4 || !p8) && (!p2 || !p6 || !p8))) continue
            }

            toRemove.push([x, y])
          }
        }

        if (toRemove.length > 0) {
          changed = true
          for (const [x, y] of toRemove) {
            out.set(x, y, false)
          }
        }
      }
    }

    return out
  }

  /** Get all points that have a false neighbor */
  boundaryPoints(): Vector<2>[] {
    const points = []
    this.forEach((x, y) => {
      // A point is on the boundary if it's on the edge of the bitmap
      if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
        points.push(vec(x, y))
        return
      }
      // Or if any of its neighbors is false
      if (
        !this.get(x, y - 1) ||
        !this.get(x, y + 1) ||
        !this.get(x - 1, y) ||
        !this.get(x + 1, y)
      ) {
        points.push(vec(x, y))
      }
    })
    return points
  }

  /** For each true value */
  forEach(cb: (x: number, y: number) => void) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y)) cb(x, y)
      }
    }
  }

  /**
   * Voronoi-based skeletonization
   * Creates a skeleton by finding the [medial axis](https://en.wikipedia.org/wiki/Medial_axis) using Voronoi diagram of boundary points
   *
   * returns a list of floating point numbers that are approximately inside of the bitmap
   */
  toSkeleton() {
    // TODO: Look into https://www.npmjs.com/package/flo-mat
    // TODO: Look into https://www.npmjs.com/package/flo-mat
    // TODO: move into Image and use marchingsquares
    const boundaryPoints = this.boundaryPoints()
    const delaunay = D3Delaunay.from(boundaryPoints) as Delaunay
    const voronoi = delaunay.voronoi([0, 0, this.width, this.height])

    const seen = new Set()
    let medialEdges = []
    for (let i = 0; i < boundaryPoints.length; i++) {
      const cell = voronoi.cellPolygon(i)
      if (!cell) continue
      for (let [x, y] of cell) {
        const key = x + ',' + y
        if (seen.has(key)) continue

        const add = (x, y, x0, y0) => {
          if (!this.bounds(x0, y0) || !this.get(x0, y0)) return false
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
}

function hasHalfFraction(n: number) {
  const frac = Math.abs(n % 1)
  return 0.49 < frac && frac < 0.51
}
