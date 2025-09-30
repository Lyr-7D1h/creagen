import { vec, Vector } from './Vector'
import { toSkeleton } from './Bitmap/toSkeleton'
import { zhangSuenThinning } from './Bitmap/zhangSuenThinning'
import { ContourExtractor, ContourExtractorOpts } from './ContourExtractor'

export class Bitmap {
  static create(width: number, height: number) {
    return new Bitmap(
      width,
      height,
      new Uint8Array(Math.ceil((width * height) / 8)),
    )
  }

  static fromBooleanMatrix(matrix: boolean[][]) {
    const width = matrix[0].length
    const height = matrix.length
    const map = Bitmap.create(width, height)
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        map.set(x, y, matrix[y][x])
      }
    }
    return map
  }

  static fromUnit8array(width, height, data: Uint8Array) {
    return new Bitmap(width, height, data)
  }

  constructor(
    public readonly width,
    public readonly height,
    private data: Uint8Array,
  ) {}

  // Compute bit index for (x, y)
  coordsToIndex(x, y) {
    if (!this.bounds(x, y)) {
      throw new RangeError(`Coordinates (${x}, ${y}) out of bounds`)
    }
    return y * this.width + x
  }

  /** return if coordinates are within bounds */
  bounds(x: number, y: number) {
    return !(x < 0 || x >= this.width || y < 0 || y >= this.height)
  }

  /** Convert an index to the x,y value of that index top left corner being [0,0]  */
  indexToCoords(i: number): [number, number] {
    if (i < 0) throw Error("Can't give negative indices")
    return [i % this.width, Math.floor(i / this.width)]
  }

  clone() {
    return new Bitmap(this.width, this.height, new Uint8Array(this.data))
  }

  /** The amount of bits in this map */
  size() {
    return this.width * this.height
  }

  // Get bit value at (x, y)
  get(x: number, y: number) {
    const i = this.coordsToIndex(x, y)
    const byteIndex = i >> 3 // divide by 8
    const bitIndex = i & 7 // modulo 8
    return ((this.data[byteIndex] >> bitIndex) & 1) > 0
  }

  /** Get a bit by index, generally faster than setting with (x,y) coordinates */
  getByIndex(i: number) {
    const byteIndex = i >> 3 // divide by 8
    const bitIndex = i & 7 // modulo 8
    return ((this.data[byteIndex] >> bitIndex) & 1) > 0
  }

  // Set bit at (x, y) to value (0 or 1)
  set(x: number, y: number, value: boolean) {
    const i = this.coordsToIndex(x, y)
    const byteIndex = i >> 3
    const bitIndex = i & 7
    if (value) {
      this.data[byteIndex] |= 1 << bitIndex // set bit
    } else {
      this.data[byteIndex] &= ~(1 << bitIndex) // clear bit
    }
  }

  /** Set a bit by index, generally faster than setting with (x,y) coordinates */
  setByIndex(i: number, value: boolean) {
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
    const i = this.coordsToIndex(x, y)
    const byteIndex = i >> 3
    const bitIndex = i & 7
    this.data[byteIndex] ^= 1 << bitIndex
  }

  // print bitmap (# for 1, . for 0)
  toPrettyString() {
    const out: string[] = []
    for (let y = 0; y < this.height; y++) {
      let row = ''
      for (let x = 0; x < this.width; x++) {
        row += this.get(x, y) ? '#' : '.'
      }
      out.push(row)
    }
    return out.join('\n')
  }

  /**
   * Use [Zhang-Suen thinning algorithm](https://rosettacode.org/wiki/Zhang-Suen_thinning_algorithm)
   * to thin the shapes made by each set of 1 bits */
  thin() {
    return zhangSuenThinning(this)
  }

  /** Get all points that have a false neighbor using 4 connectivity (left, top, right, down) */
  boundaryPoints(): Vector<2>[] {
    const points: Vector<2>[] = []
    this.forEach((v, i) => {
      if (!v) return

      let [x, y] = this.indexToCoords(i)

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

  /** Go over each bit value */
  forEach(cb: (value: boolean, index: number) => void) {
    let bitIndex = 0
    const totalBits = this.width * this.height

    for (
      let byteIndex = 0;
      byteIndex < this.data.length && bitIndex < totalBits;
      byteIndex++
    ) {
      let byte = this.data[byteIndex]

      // Process up to 8 bits in this byte
      for (let bit = 0; bit < 8 && bitIndex < totalBits; bit++, bitIndex++) {
        const value = (byte & 1) > 0
        cb(value, bitIndex)
        byte >>= 1 // shift to next bit
      }
    }
  }

  /**
   * Voronoi-based skeletonization
   * Creates a skeleton by finding the [medial axis](https://en.wikipedia.org/wiki/Medial_axis) using Voronoi diagram of boundary points
   *
   * returns a list of floating point numbers that are approximately inside of the bitmap
   */
  toSkeleton(): [number, number][] {
    return toSkeleton(this)
  }

  contours(opts?: ContourExtractorOpts) {
    return ContourExtractor.fromBitmap(this, opts).extractContours()
  }

  // contours() {
  //   const image = new Mat(8, 8)

  //   this.forEach((x, y) => {
  //     image.setAt(y, x, 1)
  //   })

  //   return findContours(image)
  // }

  // TODO: Add potrace for transforming a bitmap into smooth curves and lines
  // https://potrace.sourceforge.net/potrace.pdf,
  // https://www.npmjs.com/package/potrace
  // potrace() { }
}
