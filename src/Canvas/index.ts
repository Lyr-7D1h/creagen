import { Color } from '../Color'
import { Conversion } from '../Conversion'
import { ImageData } from '../ImageData'
import type { FlatBounds } from '../types'
import type { ArcOptions } from './Arc'
import { Arc } from './Arc'
import type { CircleOptions } from './Circle'
import { Circle } from './Circle'
import type { GeometricOptions } from './Geometry'
import type { ImageOptions } from './Image'
import { Image } from './Image'
import type { PathOptions } from './Path'
import { Path } from './Path'
import type { RectangleOptions } from './Rectangle'
import { Rectangle } from './Rectangle'
import type { Renderable } from './Renderable'
import type { TextOptions } from './Text'
import { Text } from './Text'

const defaultGeometricOptions: GeometricOptions = {
  fill: null,
  fillOpacity: 1,
  stroke: Color.BLACK,
  strokeWidth: 1,
  rotation: 0,
}

export function getWidth() {
  return Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth,
    document.body.offsetWidth,
    document.documentElement.offsetWidth,
    document.documentElement.clientWidth,
  )
}

export function getHeight() {
  return Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.documentElement.clientHeight,
  )
}

export type GeometryChild = Rectangle | Circle | Image | Text

/** How the code renders in the browser  */
export type RenderMode =
  /** Default 2d rendering format */
  | 'c2d'
  /** Svg rendering format */
  | 'svg'
// TODO: implement webgl
// | 'webgl'

export interface CanvasOptions<R extends RenderMode> {
  width?: number
  height?: number
  renderMode?: R
  canvas?: HTMLCanvasElement
}

// TODO(perf): use OffscreenCanvasRendering  https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvasRenderingContext2D
export class Canvas<R extends RenderMode> {
  children: Renderable[]
  element: HTMLCanvasElement | SVGElement
  ctx?: CanvasRenderingContext2D
  /** Wrapping <g> used in SVG mode; transforms and children are applied to this, not the root <svg> See https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/transform#elements */
  private svgGroup?: SVGGElement
  private transformMatrix: DOMMatrix = new DOMMatrix()

  static create<R extends RenderMode>(
    width: number,
    height?: number,
    renderMode?: RenderMode,
  ): Canvas<R>
  static create<R extends RenderMode>(renderMode: RenderMode): Canvas<R>
  static create(): Canvas<'c2d'>
  static create<R extends RenderMode>(
    width?: number | R,
    height?: number,
    renderMode?: R,
  ) {
    switch (typeof width) {
      case 'string': {
        renderMode = width
        width = getWidth()
        height = getHeight()
        break
      }
      case 'number': {
        height = height ?? getHeight()
        renderMode = renderMode ?? ('c2d' as R)
        break
      }
      default: {
        width = getWidth()
        height = getHeight()
        renderMode = renderMode ?? ('c2d' as R)
      }
    }

    return new Canvas<R>(width, height, renderMode)
  }

  private constructor(
    readonly width: number,
    readonly height: number,
    readonly renderMode: R,
  ) {
    if (renderMode === 'svg') {
      this.element = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      )
      this.element.setAttribute('width', this.width.toString())
      this.element.setAttribute('height', this.height.toString())
      // Transforms must be applied to a <g> child — the SVG 1.1 spec does not
      // support the `transform` attribute on the root <svg> element.
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      this.element.appendChild(g)
      this.svgGroup = g
    } else {
      const element = document.createElement('canvas')
      this.element = element
      this.setupCanvas(element)
    }
    this.children = []
  }

  private setupCanvas(element: HTMLCanvasElement) {
    element.setAttribute('width', this.width.toString())
    element.setAttribute('height', this.height.toString())
    // TODO(perf): turn off transparancy backdrop https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#turn_off_transparency
    const ctx = element.getContext('2d')
    if (ctx === null) throw Error('No 2d context supported')
    this.ctx = ctx!
  }

  setCanvas(this: Canvas<'c2d'>, element: HTMLCanvasElement) {
    this.element = element
    this.setupCanvas(element)
  }

  clear() {
    ;(this.svgGroup ?? this.element).innerHTML = ''

    if (this.ctx) {
      // clear in normal space
      this.ctx.save()
      this.ctx.resetTransform()

      this.ctx.clearRect(0, 0, this.width, this.height)

      this.ctx.restore()
    }
    this.children = []
    if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height)
  }

  private add(child: Renderable) {
    this.children.push(child)
  }

  background(color: Color) {
    this.rect(0, 0, this.width, this.height, { fill: color, strokeWidth: 0 })
  }

  // circle(position: Vector<2>, radius: number, options?: GeometricOptions)
  // circle(x: number, y: number, radius: number, options?: GeometricOptions)

  circle(
    position: ArrayLike<number>,
    radius: number,
    options?: Partial<CircleOptions>,
  ): Circle
  circle(
    x: number,
    y: number,
    radius: number,
    options?: Partial<CircleOptions>,
  ): Circle
  circle(
    x: number | ArrayLike<number>,
    y: number,
    radius?: number | Partial<CircleOptions>,
    options?: Partial<CircleOptions>,
  ): Circle {
    if (Conversion.isArrayLike(x)) {
      if (typeof radius === 'number') throw Error('Expected GeometricOptions')
      const p = Conversion.toFixedNumberArray(x, 2)
      radius = y
      x = p[0]
      y = p[1]
    }
    const circle = new Circle(x, y, radius as number, {
      ...defaultGeometricOptions,
      ...options,
    })
    this.add(circle)
    return circle
  }

  rect(
    position: ArrayLike<number>,
    width: number,
    height: number,
    options: Partial<RectangleOptions>,
  ): Rectangle
  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: Partial<RectangleOptions>,
  ): Rectangle
  rect(
    x1: ArrayLike<number> | number,
    x2: number,
    x3: number,
    x4?: number | Partial<RectangleOptions>,
    x5?: Partial<RectangleOptions>,
  ): Rectangle {
    if (Conversion.isArrayLike(x1)) {
      const p = Conversion.toFixedNumberArray(x1, 2)
      x5 = x4 as Partial<RectangleOptions>
      x3 = x2
      x4 = x3
      x1 = p[0]
      x2 = p[1]
    }
    const rect = new Rectangle(x1, x2, x3, x4 as number, {
      ...defaultGeometricOptions,
      ...x5,
    })
    this.add(rect)
    return rect
  }

  /**
   * Create a canvas image from `src` at a location scaled to `width` and `height`
   *
   * @param src Image source (URL, base64, or ImageData)
   * @param x X position (defaults to 0)
   * @param y Y position (defaults to 0)
   * @param width Image width (defaults to original image width)
   * @param height Image height (defaults to original image height)
   * @param imageOptions Additional image rendering options
   *
   * @example
   * ```ts
   * const canvas = Canvas.create()
   * await canvas.image("data:image/png;base64,iVBORw0...", 0, 0, 200, 200)
   * ```
   */
  async image(
    src: string | ImageData,
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    imageOptions?: Partial<ImageOptions>,
  ) {
    if (typeof src === 'string') src = await ImageData.create(src)
    const img = new Image(
      src,
      x ?? 0,
      y ?? 0,
      width ?? src.width,
      height ?? src.height,
      {
        ...defaultGeometricOptions,
        ...imageOptions,
      },
    )
    this.add(img)
    return img
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
    options?: Partial<ArcOptions>,
  ) {
    const arc = new Arc(
      { ...defaultGeometricOptions, ...options },
      x,
      y,
      radius,
      startAngle,
      endAngle,
      counterclockwise,
    )
    this.add(arc)
    return arc
  }

  /**
   * A path made up of segments by sets of points with different drawing options
   *
   * Example:
   * ```typescript
   * const canvas = Canvas.create()
   * const path = canvas.path()
   *   .strokeWidth(2)        // First segment will have width 2
   *   .add(0, 0).add(10, 10) // Add points to first segment
   *   .strokeWidth(5)        // Creates new segment with width 5
   *   .add(20, 5).add(30, 15) // Add points to second segment
   *   .smooth(true)          // Creates new segment with smooth curves
   *   .add(40, 10).add(50, 20) // Add points to third segment
   * ```
   */
  path(options?: Partial<PathOptions>) {
    const path = new Path({
      ...defaultGeometricOptions,
      fill: null,
      closed: false,
      wrapAround: null,
      tension: 1,
      ...options,
    })
    this.add(path)
    return path
  }

  text(
    value: string,
    position: ArrayLike<number>,
    options?: Partial<TextOptions>,
  ): Text
  text(
    value: string,
    x: number,
    y: number,
    options?: Partial<TextOptions>,
  ): Text
  text(
    value: string,
    x: ArrayLike<number> | number,
    yOrOptions?: number | Partial<TextOptions>,
    options?: Partial<TextOptions>,
  ): Text {
    let xPosition: number
    let yPosition: number

    if (Conversion.isArrayLike(x)) {
      const p = Conversion.toFixedNumberArray(x, 2)
      xPosition = p[0]
      yPosition = p[1]

      if (typeof yOrOptions === 'number') throw Error('Expected TextOptions')
      options = yOrOptions
    } else {
      if (typeof yOrOptions !== 'number')
        throw Error('Expected a number for y number')
      xPosition = x
      yPosition = yOrOptions
    }

    const text = new Text(xPosition, yPosition, value, {
      ...defaultGeometricOptions,
      fill: Color.BLACK,
      fontFamily: 'sans-serif',
      fontSize: 16,
      fontStyle: 'normal',
      fontWeight: 'normal',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      maxWidth: null,
      lineHeight: 1.2,
      ...options,
    })

    this.add(text)
    return text
  }

  /** Draw to canvas */
  draw() {
    // return as svg when no canvas context
    if (!this.ctx) {
      const target = this.svgGroup ?? this.element
      for (const c of this.children) {
        if (!c._dirty) continue
        target.appendChild(c._svg())
      }
      return
    }

    for (const c of this.children) {
      if (!c._dirty) continue
      c._canvas(this.ctx)
    }
  }

  /** Returns bounds [xmin, xmax, ymin, ymax] */
  bounds(): FlatBounds<2> {
    return [0, this.width, 0, this.height]
  }

  html(): SVGElement | HTMLCanvasElement {
    this.draw()
    return this.element
  }

  /** Reset the transformation matrix to the identity matrix */
  resetTransform(): this {
    this.transformMatrix = new DOMMatrix()
    this.applyTransform()
    return this
  }

  /** Translate the coordinate system by `(x, y)` */
  translate(x: number, y: number): this {
    this.transformMatrix = this.transformMatrix.translate(x, y)
    this.applyTransform()
    return this
  }

  /** Scale the coordinate system. `y` defaults to `x` for uniform scaling */
  scale(x: number, y?: number): this {
    const sy = y ?? x
    this.transformMatrix = this.transformMatrix.scale(x, sy)
    this.applyTransform()
    return this
  }

  /** Rotate the coordinate system by `angle` degrees around the origin */
  rotate(angle: number): this {
    this.transformMatrix = this.transformMatrix.rotate(angle)
    this.applyTransform()
    return this
  }

  /** Multiply the current transform by the matrix `[a, b, c, d, e, f]` */
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): this {
    this.transformMatrix = this.transformMatrix.multiply(
      new DOMMatrix([a, b, c, d, e, f]),
    )
    this.applyTransform()
    return this
  }

  /** Replace the current transform with the matrix `[a, b, c, d, e, f]` */
  setTransform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): this {
    this.transformMatrix = new DOMMatrix([a, b, c, d, e, f])
    this.applyTransform()
    return this
  }

  private applyTransform() {
    if (this.ctx) {
      this.ctx.setTransform(this.transformMatrix)
    } else if (this.svgGroup) {
      const { a, b, c, d, e, f } = this.transformMatrix
      this.svgGroup.setAttribute(
        'transform',
        `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
      )
    }
  }

  /** Return the current transformation matrix as `[a, b, c, d, e, f]` */
  getTransform(): DOMMatrixReadOnly {
    return this.transformMatrix
  }
}
