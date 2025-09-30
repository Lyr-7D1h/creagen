import { ImageData } from '../ImageData'
import { Color } from '../Color'
import { Circle, CircleOptions } from './Circle'
import { Image, ImageOptions } from './Image'
import { defaultGeometricOptions } from './Geometry'
import { Path, PathOptions } from './Path'
import { Rectangle, RectangleOptions } from './Rectangle'
import { Arc, ArcOptions } from './Arc'
import { FlatBounds } from '../types'
import { Conversion } from '../Conversion'
import { Renderable } from './Renderable'

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

export type GeometryChild = Rectangle | Circle | Image

/** How the code renders in the browser  */
export enum RenderMode {
  /** Default 2d rendering format */
  C2D = 'c2d',
  /** WebGL rendering format */
  WebGL = 'webgl',
  /** Svg rendering format */
  Svg = 'svg',
}
export interface CanvasOptions<R extends RenderMode = RenderMode.C2D> {
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

  width: number
  height: number

  static create<R extends RenderMode>(opts?: CanvasOptions<R>) {
    return new Canvas<R>(opts)
  }

  private constructor(opts?: CanvasOptions<R>) {
    const renderMode = opts?.renderMode ?? RenderMode.C2D
    this.width = opts?.width ?? getWidth()
    this.height = opts?.height ?? getHeight()

    if (renderMode === RenderMode.WebGL) throw Error('WebGL not supported yet')
    if (renderMode === RenderMode.Svg) {
      if (opts?.canvas) throw Error('Canvas cannot be passed to SVG mode')
      this.element = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      )
      this.element.setAttribute('width', this.width.toString())
      this.element.setAttribute('height', this.height.toString())
    } else {
      this.element = opts?.canvas ?? document.createElement('canvas')
      this.element.setAttribute('width', this.width.toString())
      this.element.setAttribute('height', this.height.toString())
      const ctx = this.element.getContext('2d') // TODO(perf): turn off transparancy backdrop https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#turn_off_transparency
      if (ctx === null) throw Error('No 2d context supported')
      this.ctx = ctx!
    }
    this.children = []
  }

  clear() {
    this.element.innerHTML = ''
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

  line(
    x1: ArrayLike<number>,
    x2: ArrayLike<number>,
    opts?: Partial<PathOptions>,
  ) {
    const line = this.path(opts)
    line.add(x1)
    line.add(x2)
    this.add(line)
    return line
  }

  async load() {
    // if svg
    if (!this.ctx) {
      for (const c of this.children) {
        this.element.appendChild(c._svg())
      }
      return
    }

    for (const c of this.children) {
      await c._canvas(this.ctx)
    }
  }

  /** Returns bounds [xmin, xmax, ymin, ymax] */
  bounds(): FlatBounds<2> {
    return [0, this.width, 0, this.height]
  }

  async html(): Promise<SVGElement | HTMLCanvasElement> {
    await this.load()
    return this.element
  }
}
