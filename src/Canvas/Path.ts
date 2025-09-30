import * as Math from '../math'
import { GeometricOptions, Geometry } from './Geometry'
import { vec, Vector } from '../Vector'
import { solveTriadiagonalMatrix } from '../lin'
import { FlatBounds } from '../types'
import { Conversion } from '../Conversion'
import { Color } from '../Color'

export interface PathOptions extends GeometricOptions {
  /** Connect the first point with the last point */
  closed: boolean
  /** Wrap the path around a certain bound */
  wrapAround: FlatBounds<2> | null
  /** Control curve tension (0.0-1.0): higher values make sharper curves */
  tension: number
}

function isSmooth(options: PathOptions): boolean {
  return options.tension < 1
}

interface PathSegment {
  points: Vector<2>[]
  options: PathOptions
}

export class Path extends Geometry<PathOptions> {
  private _segments: PathSegment[] = []
  /** Reference to current segment */
  currentPoints: Vector<2>[] = undefined!

  constructor(options: PathOptions) {
    super(options)
    this.newSegment()
  }

  private newSegment(): void {
    const points: Vector<2>[] = []
    if (this.currentPoints) {
      let pointsLength = this.currentPoints.length
      // don't do anything if segment is empty
      if (pointsLength === 0) return
      // add last point from previous segment
      points.push(this.currentPoints[pointsLength - 1])
    }
    this.currentPoints = points
    this.options = { ...this.options }
    this._segments.push({
      points: points,
      options: this.options,
    })
  }

  /*
   * Set stroke width for the path
   */
  override strokeWidth(width: number): this {
    if (this.options.strokeWidth === width) return this
    this.newSegment()
    super.strokeWidth(width)
    return this
  }

  /**
   * Set stroke color for the path
   */
  override stroke(color: Color): this {
    if (this.options.stroke === color) return this
    this.newSegment()
    super.stroke(color)
    return this
  }

  /**
   * Set fill color for the path
   */
  override fill(color: Color | null): this {
    if (this.options.fill === color) return this
    this.newSegment()
    super.fill(color)
    return this
  }

  /**
   * Set fill opacity for the path
   */
  override fillOpacity(opacity: number): this {
    if (this.options.fillOpacity === opacity) return this
    this.newSegment()
    super.fillOpacity(opacity)
    return this
  }

  /**
   * Set smooth option for the path
   * @param tension Control curve tension (0.0-1.0): higher values make sharper curves, by default smooth (0)
   */
  smooth(tension: number = 0): this {
    if (this.options.tension === tension) return this
    this.newSegment()
    this.options.tension = tension
    return this
  }

  /**
   * Set whether the path should be closed (connect first and last points)
   */
  closed(closed: boolean = true): this {
    if (this.options.closed === closed) return this
    this.newSegment()
    this.options.closed = closed
    return this
  }

  /**
   * Set wrap around bounds for the path
   */
  wrapAround(bounds: FlatBounds<2> | null): this {
    if (this.options.wrapAround === bounds) return this
    this.newSegment()
    this.options.wrapAround = bounds
    return this
  }

  /** Get information about current segments (for debugging) */
  segments(): ReadonlyArray<Readonly<PathSegment>> {
    return this._segments
  }

  /** Get all points in the path */
  points() {
    return this._segments.reduce(
      (a, c) => (a = a.concat(c.points)),
      [] as Vector<2>[],
    )
  }

  /** Get total number of points across all segments */
  size(): number {
    return this._segments.reduce(
      (total, segment) => total + segment.points.length,
      0,
    )
  }

  /** TODO: https://github.com/xaviergonz/js-angusj-clipper */
  // union(path: Path) {}

  add(points: ArrayLike<number>[]): this
  add(v: ArrayLike<number>): this
  add(x: number, y: number): this
  add(
    x1: number | ArrayLike<number> | ArrayLike<ArrayLike<number>>,
    x2?: number,
  ): this {
    if (typeof x1 === 'number' && typeof x2 === 'number') {
      this.currentPoints.push(vec(x1, x2))
    } else if (Array.isArray(x1)) {
      const vectors = Conversion.toVectorArray(x1, 2)
      if (vectors.length === 1) {
        this.currentPoints.push(vectors[0])
      } else {
        this.currentPoints.push(...vectors)
      }
    } else {
      throw Error('Invalid arguments given')
    }
    return this
  }

  _svg(): SVGPathElement | SVGGElement {
    // If all segments have the same visual options, combine them into one path
    const hasUniformOptions = this._segments.every(
      (segment) =>
        segment.options.strokeWidth === this._segments[0].options.strokeWidth &&
        segment.options.stroke === this._segments[0].options.stroke &&
        segment.options.fill === this._segments[0].options.fill &&
        segment.options.fillOpacity === this._segments[0].options.fillOpacity,
    )

    if (hasUniformOptions) {
      // Single path element
      const element = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      )
      super._applySvgOptions(element)

      let combinedPath = ''
      for (const segment of this._segments) {
        if (segment.points.length === 0) continue
        const segmentPath = svgPath(segment)
        if (segmentPath) {
          combinedPath += (combinedPath ? ' ' : '') + segmentPath
        }
      }

      element.setAttribute('d', combinedPath)
      return element
    } else {
      // Multiple path elements in a group
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')

      for (const segment of this._segments) {
        if (segment.points.length === 0) continue

        const pathElement = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path',
        )

        // Apply segment-specific options
        pathElement.setAttribute('stroke', segment.options.stroke.hex())
        pathElement.setAttribute(
          'fill',
          segment.options.fill === null ? 'none' : segment.options.fill.hex(),
        )
        pathElement.setAttribute(
          'fill-opacity',
          segment.options.fillOpacity.toString(),
        )
        pathElement.setAttribute(
          'stroke-width',
          segment.options.strokeWidth.toString(),
        )

        const segmentPath = svgPath(segment)
        if (segmentPath) {
          pathElement.setAttribute('d', segmentPath)
          group.appendChild(pathElement)
        }
      }

      return group
    }
  }

  _canvas(ctx: CanvasRenderingContext2D): void {
    // Render each segment with its own options
    for (const segment of this._segments) {
      if (segment.points.length === 0) continue

      const path = new Path2D(svgPath(segment))
      ctx.beginPath()

      // Apply segment-specific options
      ctx.lineWidth = segment.options.strokeWidth
      if (segment.options.fill) {
        ctx.fillStyle = segment.options.fill.hex()
        ctx.fill(path)
      } else {
        ctx.strokeStyle = segment.options.stroke.hex()
        ctx.stroke(path)
      }
    }
  }
}

// https://stackoverflow.com/questions/22556381/approximating-data-with-a-multi-segment-cubic-bezier-curve-and-a-distance-as-wel/22582447#22582447
// https://github.com/paperjs/paper.js/blob/92775f5279c05fb7f0a743e9e7fa02cd40ec1e70/src/path/Segment.js#L428
// https://www.particleincell.com/2012/bezier-splines/
// Closed loop: https://www.jacos.nl/jacos_html/spline/circular/index.html, https://www.jacos.nl/jacos_html/spline/theory/theory_1.html
// https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline
/** Calculate the control point coordinates for a given `index` */
function computeControlPoints(
  points: Vector<2>[],
  index: number,
  /** Tension, number in range [0,1] */
  tension: number = 0,
): [number[], number[]] {
  // all the knots
  const K = points
  const n = points.length - 1
  // stores all equations
  // [P_(1,i-1), P_(1,i), P_(1,i+1)]
  const A = Array.from(Array(n), () => new Array(3) as [number, number, number])
  // right hand side of all equations
  const b = new Array(n)

  // First segment equation
  // 2 * P_(1,0) + P_(1,1) = K_0 + 2 * K_1
  //
  // In array form:
  // [0, 2 * P_(1,0), P_(1,1), K_0 + 2 * K_1]
  // A[0][0] = 0
  A[0][1] = 2
  A[0][2] = 1
  b[0] = K[0][index] + 2 * K[1][index]

  // Interal segments
  for (let i = 1; i < n - 1; i++) {
    A[i][0] = 1
    A[i][1] = 4
    A[i][2] = 1
    b[i] = 4 * K[i][index] + 2 * K[i + 1][index]
  }

  A[n - 1][0] = 2
  A[n - 1][1] = 7
  // A[n - 1][2] = 0
  b[n - 1] = 8 * K[n - 1][index] + K[n][index]

  const p1 = solveTriadiagonalMatrix(A, b)
  const p2 = new Array(n)
  for (let i = 0; i < n - 1; i++) {
    p2[i] = 2 * K[i + 1][index] - p1[i + 1]
  }

  p2[n - 1] = 0.5 * (K[n][index] + p1[n - 1])

  // linearily interpolate control points to the knots to reduce smoothness
  const p1x = new Array(n)
  const p2x = new Array(n)
  for (let i = 0; i < n; i++) {
    p1x[i] = (1 - tension) * p1[i] + tension * K[i][index]
    p2x[i] = (1 - tension) * p2[i] + tension * K[i + 1][index]
  }

  return [p1x, p2x]
}

/** Get direction of where x,y is out of bounds compared to the boxed bounds. Returns null if inside bounds */
function outsideBoundDirection(
  { x, y }: Vector<2>,
  [xmin, xmax, ymin, ymax]: FlatBounds<2>,
): Vector<2> | null {
  const direction = vec(0, 0)
  if (x < xmin) {
    direction.x = -1
  } else if (x > xmax) {
    direction.x = 1
  }
  if (y < ymin) {
    direction.y = -1
  } else if (y > ymax) {
    direction.y = 1
  }
  if (direction.x === 0 && direction.y === 0) return null
  return direction
}

function wrapAroundPoints(
  options: PathOptions,
  points: Vector<2>[],
  bounds: FlatBounds<2>,
  currentIndex: number = 0,
): Vector<2>[][] {
  const [xmin, xmax, ymin, ymax] = bounds
  let segments: Vector<2>[][] = []
  const width = xmax - xmin
  const height = ymax - ymin

  // const [ymin, ymax] = bounds[1]
  let queue = [...points.map((p) => p.clone())]
  for (let i = 0; i < queue.length - 1; i++) {
    currentIndex += 1
    // what direction is the first point outside of bounds
    let d1 = outsideBoundDirection(queue[i], bounds)
    // what direction is the second point outside of bounds
    let d2 = outsideBoundDirection(queue[i + 1], bounds)
    // if both inside of bounds skip
    if (d1 === null && d2 === null) continue
    // if both outside skip
    if (d1 !== null && d2 !== null) continue

    // always one point out of bounds
    const d = (d1 || d2)!
    // if left use xmin as limit otherwise xmax
    const xm = d.x < 0 ? xmin : xmax
    // if above use ymin as limit otherwise ymax
    const ym = d.y < 0 ? ymin : ymax

    let [x1, y1] = queue[i]
    let [x2, y2] = queue[i + 1]

    // swap points to keep x1 < x2
    let a
    if (x1 > x2) {
      a = (y1 - y2) / (x1 - x2)
    } else {
      a = (y2 - y1) / (x2 - x1)
    }

    // if diagonal
    if (d.x !== 0 && d.y !== 0) {
      // distance in x from outside point to xm boundry
      const dx1 = Math.abs(xm - x1)
      // distance in x from outside point to ym boundry
      const dx2 = Math.abs(ym - y1) / Math.abs(a)

      if (dx1 < dx2) {
        // xm boundry is closer
        d.y = 0
      } else if (dx1 > dx2) {
        // ym boundry is closer
        d.x = 0
      }
    }

    let ix
    // if y is within bounds or it is diagonal bounds with x being closer it should limit the intersection point to the boundry
    if (d.y === 0) {
      ix = xm
    } else {
      ix = x1 + (ym - y1) / a
    }
    let iy
    if (d.x === 0) {
      iy = ym
    } else {
      iy = y1 + a * (xm - x1)
    }

    let intersection = vec(ix, iy)

    let outsideSegment
    if (d1 === null) {
      // starting points are inside
      outsideSegment = [
        intersection,
        ...queue.splice(
          i + 1,
          queue.length - i + 2,
          ...(!isSmooth(options) ? [intersection] : []),
        ),
      ]

      // add inside point and the two outside points
      if (isSmooth(options)) {
        if (typeof outsideSegment[currentIndex + 2] === 'undefined') {
          if (points[currentIndex - 1] !== queue[queue.length - 2]) {
            queue.splice(queue.length - 2, 0, points[currentIndex - 1])
          }
          queue.push(points[currentIndex + 1])
        } else {
          queue.push(points[currentIndex + 1])
          queue.push(points[currentIndex + 2])
        }
        i += 2
      }
      // should be in the end of queue now
      console.assert(queue.length - 1 === i)
    } else {
      // starting points are outside
      outsideSegment = queue.splice(0, i + 1, intersection)
      if (isSmooth(options)) {
        outsideSegment.push(intersection)
      }
      i = -1
    }

    // if intersection and next point are the same, remove the intersection
    // if (intersection.equals(queue[1])) queue.shift()

    const outsideSegments = wrapAroundPoints(options, outsideSegment, [
      xmin + d.x * width,
      xmax + d.x * width,
      ymin + d.y * width,
      ymax + d.y * width,
    ])

    // console.log(outsideSegments)
    for (const s of outsideSegments) {
      for (const p of s) {
        p.x += d.x * -1 * width
        p.y += d.y * -1 * height
      }
    }

    segments = segments.concat(outsideSegments)
    continue
  }

  if (queue.length > 0) {
    const d = outsideBoundDirection(queue[0], bounds)

    if (d !== null) {
      //  if whole queue is outside bounds, wrap around on first point
      const outsideSegments = wrapAroundPoints(options, queue, [
        xmin + d.x * width,
        xmax + d.x * width,
        ymin + d.y * width,
        ymax + d.y * width,
      ])
      for (const s of outsideSegments) {
        for (const p of s) {
          p.x += d.x * -1 * width
          p.y += d.y * -1 * height
        }
      }
      segments = segments.concat(outsideSegments)
    } else {
      segments.push(queue)
    }
  }
  return segments
}

function svgPath({ points, options }: PathSegment): string {
  if (points.length === 1) return ''

  let segments = [points]
  if (options.wrapAround) {
    segments = wrapAroundPoints(options, points, options.wrapAround).filter(
      (s) => s.length > 1,
    )
  }

  if (isSmooth(options)) {
    // TODO: fix in case of wrap around
    let path = ''
    for (const segment of segments) {
      if (segment.length < 3) {
        throw Error(
          `Need atleast 3 points to create a smooth path: '${points}' given`,
        )
      }

      path += `M${points[0][0]} ${points[0][1]}`

      const [p1x, p2x] = computeControlPoints(segment, 0, options.tension || 0)
      const [p1y, p2y] = computeControlPoints(segment, 1, options.tension || 0)
      for (let i = 0; i < p1x.length; i++) {
        path += `C${p1x[i]} ${p1y[i]}, ${p2x[i]} ${p2y[i]}, ${points[i + 1][0]} ${points[i + 1][1]}`
      }
    }
    return path
  }

  let path = ''
  for (const segment of segments) {
    if (segment.length < 2) continue

    // add to path
    path += segment
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`)
      .join(' ')
    continue
  }
  return path
}
